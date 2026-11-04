// Shared helpers for the CMS sync and build scripts.
import { parse } from 'node-html-parser';

export const PAGES = [
  { id: 'home', label: 'Home', src: 'index.html' },
  { id: 'about', label: 'About', src: 'about/index.html' },
  { id: 'get-started', label: 'Get started', src: 'get-started/index.html' },
  { id: 'contact', label: 'Contact', src: 'contact/index.html' },
];

export const parseHtml = (html) =>
  parse(html, { comment: true, blockTextElements: { script: true, style: true, noscript: true } });

const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// HTML (text + <em>/<strong> only) -> editor-friendly text: *italic*, **bold**
export function htmlToMd(html) {
  return decode(
    html
      .replace(/\s+/g, ' ')
      .replace(/<strong>([\s\S]*?)<\/strong>/g, '**$1**')
      .replace(/<em>([\s\S]*?)<\/em>/g, '*$1*')
  ).trim();
}

// editor text -> safe HTML
export function mdToHtml(md) {
  return escape(String(md ?? '').trim())
    .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([\s\S]+?)\*/g, '<em>$1</em>')
    .replace(/\n+/g, ' ');
}

// Source offsets of an element's inner HTML.
export function innerRange(src, el) {
  const [start, end] = el.range;
  const open = src.indexOf('>', start) + 1;
  const close = src.lastIndexOf('</', end);
  return [open, close];
}

// Apply [start, end, text] replacements without touching the rest of the file.
export function splice(src, edits) {
  return edits.sort((a, b) => b[0] - a[0]).reduce((s, [a, b, t]) => s.slice(0, a) + t + s.slice(b), src);
}
