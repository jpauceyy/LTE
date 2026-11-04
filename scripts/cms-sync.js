// One-command CMS sync. Safe to re-run whenever you add new sections or text to a page.
//  1. Tags editable text in each page's <main> with data-cms="section.field"
//  2. Seeds content/pages/*.json with any new fields (existing edits are kept)
//  3. Swaps hard-coded links for {{settings}} tokens and seeds content/settings.json
//  4. Moves homepage reviews into content/reviews.json
//  5. Regenerates admin/config.yml for Decap CMS
import fs from 'node:fs';
import { PAGES, parseHtml, htmlToMd, innerRange, splice } from './lib.js';

const readJson = (p, d) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : d);
const writeJson = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n');

const CANDIDATES = 'h1,h2,h3,p,span.k';
const EXCLUDE = 'svg,[aria-hidden="true"],[role="img"],form,.revs,#formCard,.crumbs,.hp';
const TAG_LABEL = { h1: 'Main heading', h2: 'Heading', h3: 'Subheading', p: 'Paragraph', span: 'Label' };

const isExcluded = (el) => {
  for (let n = el; n && n.tagName !== 'MAIN'; n = n.parentNode) if (n.matches && n !== el && n.matches(EXCLUDE)) return true;
  return el.matches(EXCLUDE);
};
const isSimple = (el) =>
  el.text.trim() &&
  !el.innerHTML.includes('<!--') &&
  el.querySelectorAll('*').every((c) => ['em', 'strong'].includes(c.rawTagName) && !c.rawAttrs.trim());

// ---------- settings ----------
const SETTINGS_TOKENS = [
  ['https://formsubmit.co/contact@lukefenners.com', 'https://formsubmit.co/{{contact_email}}'],
  ['https://t.me/learntryearn', '{{telegram_url}}'],
  ['https://www.tiktok.com/@learntryearn', '{{tiktok_url}}'],
  ['https://YOUR-BROKER-LINK.com', '{{broker_url}}'],
  ['https://www.YOUR-DOMAIN.com', '{{site_url}}'],
];
const settings = readJson('content/settings.json', {
  site_url: 'https://www.YOUR-DOMAIN.com',
  telegram_url: 'https://t.me/learntryearn',
  tiktok_url: 'https://www.tiktok.com/@learntryearn',
  broker_url: 'https://YOUR-BROKER-LINK.com',
  contact_email: 'contact@lukefenners.com',
});

// ---------- pages ----------
const pageFields = {}; // id -> [{section, sectionLabel, fields:[{name,label,widget}]}]
for (const page of PAGES) {
  let src = fs.readFileSync(page.src, 'utf8');
  for (const [from, to] of SETTINGS_TOKENS) src = src.split(from).join(to);

  // footer text shared by every page
  let root = parseHtml(src);
  const edits = [];
  const tagEl = (el, key) => edits.push([el.range[0] + 1 + el.rawTagName.length, el.range[0] + 1 + el.rawTagName.length, ` data-cms="${key}"`]);
  const risk = root.querySelector('footer p.risk');
  const blurb = root.querySelector('footer .f-brand p');
  for (const [el, key] of [[risk, 'settings.risk_warning'], [blurb, 'settings.footer_blurb']]) {
    if (!el) continue;
    if (!el.getAttribute('data-cms')) tagEl(el, key);
    if (!(key.slice(9) in settings)) settings[key.slice(9)] = htmlToMd(el.innerHTML);
  }

  // main content
  const main = root.querySelector('main');
  const sections = main.childNodes.filter((n) => n.tagName === 'SECTION');
  const used = new Set(root.querySelectorAll('[data-cms]').map((e) => e.getAttribute('data-cms')));
  sections.forEach((sec, i) => {
    const sid = (sec.id || `section${i + 1}`).replace(/[^a-z0-9]/gi, '_');
    sec.querySelectorAll(CANDIDATES).forEach((el) => {
      if (el.getAttribute('data-cms') || isExcluded(el) || !isSimple(el)) return;
      const tag = el.rawTagName;
      let n = 1, key;
      do key = `${sid}.${tag}${n++}`; while (used.has(key));
      used.add(key);
      tagEl(el, key);
    });
  });
  src = splice(src, edits);

  // reviews -> list rendered at build time
  if (page.id === 'home' && src.includes('<figure class="rev ')) {
    root = parseHtml(src);
    const revs = root.querySelector('.revs');
    if (!fs.existsSync('content/reviews.json')) {
      writeJson('content/reviews.json', {
        reviews: revs.querySelectorAll('figure.rev').map((f) => ({
          tag: f.querySelector('.tagp')?.text.trim() || '',
          quote: htmlToMd(f.querySelector('blockquote').innerHTML),
          name: f.querySelector('figcaption').childNodes[0].text.trim(),
          since: f.querySelector('figcaption span')?.text.trim() || '',
        })),
      });
    }
    const [a, b] = innerRange(src, revs);
    src = splice(src, [[a, b, '<!-- rendered from content/reviews.json -->']]).replace('<div class="revs">', '<div class="revs" data-cms-list="reviews">');
  }
  fs.writeFileSync(page.src, src);

  // seed JSON in DOM order, keeping existing edits
  root = parseHtml(src);
  const file = `content/pages/${page.id}.json`;
  const old = readJson(file, {});
  const head = root.querySelector('head');
  const data = {
    seo: old.seo || {
      title: head.querySelector('title').text.trim(),
      description: head.querySelector('meta[name="description"]').getAttribute('content'),
    },
  };
  const groups = [];
  root.querySelectorAll('main [data-cms]').forEach((el) => {
    const [sid, field] = el.getAttribute('data-cms').split('.');
    let g = groups.find((x) => x.section === sid);
    if (!g) {
      const secEl = el.closest('section');
      const h = secEl.querySelector('h1,h2');
      groups.push((g = { section: sid, sectionLabel: h ? htmlToMd(h.innerHTML).replace(/\*/g, '') : sid, fields: [] }));
    }
    const value = old[sid]?.[field] ?? htmlToMd(el.innerHTML);
    (data[sid] ||= {})[field] = value;
    const tag = el.rawTagName;
    const snippet = value.replace(/\*/g, '').slice(0, 48) + (value.length > 48 ? '…' : '');
    g.fields.push({ name: field, label: `${TAG_LABEL[tag]}: ${snippet}`, widget: tag === 'p' ? 'text' : 'string' });
  });
  writeJson(file, data);
  pageFields[page.id] = groups;
}
writeJson('content/settings.json', settings);

// ---------- admin/config.yml ----------
const q = JSON.stringify;
const HINT = 'Wrap words in *single asterisks* for the blue italic accent, or **double** for bold.';
let y = `# Generated by "npm run cms:sync". Edit scripts/cms-sync.js rather than this file.
backend:
  name: github
  repo: jpauceyy/LTE
  branch: main
  auth_endpoint: api/auth   # base_url is set to the site's own origin in admin/index.html
local_backend: true          # "npm run cms:local" + "npm run dev" to edit without logging in
publish_mode: simple
media_folder: assets/img/uploads
public_folder: /assets/img/uploads
site_url: ${q(settings.site_url)}
display_url: ${q(settings.site_url)}

collections:
  - name: settings
    label: Site settings
    files:
      - name: settings
        label: Links, contact and footer
        file: content/settings.json
        format: json
        fields:
          - { name: site_url, label: Website address, widget: string, hint: "Full address, e.g. https://www.learntryearn.com" }
          - { name: telegram_url, label: Telegram link, widget: string }
          - { name: tiktok_url, label: TikTok link, widget: string }
          - { name: broker_url, label: Vantage sign-up link, widget: string, hint: "Your referral link. Used by every Open account / Open a demo button." }
          - { name: contact_email, label: Contact form email, widget: string, hint: "Where contact form messages are sent." }
          - { name: footer_blurb, label: Footer description, widget: text }
          - { name: risk_warning, label: Footer risk warning, widget: text, hint: ${q(HINT)} }

  - name: reviews
    label: Reviews
    files:
      - name: reviews
        label: Homepage reviews
        file: content/reviews.json
        format: json
        fields:
          - name: reviews
            label: Reviews
            label_singular: Review
            widget: list
            summary: "{{fields.name}}: {{fields.quote}}"
            fields:
              - { name: quote, label: Review, widget: text, hint: "Use the member's own words. Get written permission first." }
              - { name: name, label: Member name, widget: string }
              - { name: since, label: Member since, widget: string, required: false, hint: "e.g. Member since March 2026" }
              - { name: tag, label: Small tag above the review, widget: string, required: false, hint: "Optional. Leave blank to hide." }

  - name: pages
    label: Page text
    files:
`;
for (const page of PAGES) {
  y += `      - name: ${page.id}
        label: ${q(page.label)}
        file: content/pages/${page.id}.json
        format: json
        fields:
          - name: seo
            label: Search engine title and description
            widget: object
            collapsed: true
            fields:
              - { name: title, label: Page title, widget: string, hint: "Shown in the browser tab and Google. Keep under 60 characters." }
              - { name: description, label: Description, widget: text, hint: "Shown under the title in Google. Keep under 160 characters." }
`;
  for (const g of pageFields[page.id]) {
    y += `          - name: ${g.section}
            label: ${q('Section: ' + g.sectionLabel)}
            widget: object
            collapsed: true
            fields:
`;
    for (const f of g.fields) y += `              - { name: ${f.name}, label: ${q(f.label)}, widget: ${f.widget}, hint: ${q(HINT)} }\n`;
  }
}
fs.writeFileSync('admin/config.yml', y);
console.log('CMS sync done:', PAGES.map((p) => `${p.id} ${pageFields[p.id].reduce((n, g) => n + g.fields.length, 0)} fields`).join(', '));
