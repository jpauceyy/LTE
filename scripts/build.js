// Builds the site into dist/: fills every data-cms element, {{setting}} token, SEO tag and the
// reviews list from content/*.json. Vercel runs this on every deploy (see vercel.json).
import fs from 'node:fs';
import { PAGES, parseHtml, mdToHtml, innerRange, splice } from './lib.js';

const json = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const settings = json('content/settings.json');
const reviews = json('content/reviews.json').reviews || [];
const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

fs.rmSync('dist', { recursive: true, force: true });
fs.mkdirSync('dist');
for (const dir of ['assets', 'admin']) fs.cpSync(dir, `dist/${dir}`, { recursive: true });

for (const page of PAGES) {
  const content = json(`content/pages/${page.id}.json`);
  let src = fs.readFileSync(page.src, 'utf8');
  const root = parseHtml(src);
  const edits = [];

  root.querySelectorAll('[data-cms]').forEach((el) => {
    const [scope, field] = el.getAttribute('data-cms').split('.');
    const value = scope === 'settings' ? settings[field] : content[scope]?.[field];
    if (value == null) return;
    const [a, b] = innerRange(src, el);
    edits.push([a, b, mdToHtml(value)]);
  });

  const list = root.querySelector('[data-cms-list="reviews"]');
  if (list) {
    const [a, b] = innerRange(src, list);
    edits.push([a, b, '\n' + reviews.map((r) =>
      `      <figure class="rev glass tilt" data-rise>${r.tag ? `<span class="tagp">${mdToHtml(r.tag)}</span>` : ''}<blockquote>${mdToHtml(r.quote)}</blockquote><figcaption>${mdToHtml(r.name)}${r.since ? `<span>${mdToHtml(r.since)}</span>` : ''}</figcaption></figure>`
    ).join('\n') + '\n    ']);
  }
  src = splice(src, edits);

  const { title, description } = content.seo || {};
  if (title) src = src.replace(/<title>[\s\S]*?<\/title>/, `<title>${attr(title)}</title>`).replace(/(<meta property="og:title" content=")[^"]*/, `$1${attr(title)}`);
  if (description) src = src.replace(/(<meta name="description" content=")[^"]*/, `$1${attr(description)}`);

  src = src
    .replace(/\{\{(\w+)\}\}/g, (m, k) => (k in settings ? attr(settings[k]).replace(/\/$/, '') : m))
    .replace(/ data-cms(-list)?="[^"]*"/g, '');

  const out = `dist/${page.src}`;
  fs.mkdirSync(out.replace(/[^/]+$/, ''), { recursive: true });
  fs.writeFileSync(out, src);
}
console.log(`Built ${PAGES.length} pages into dist/`);
