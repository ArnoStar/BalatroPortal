// The portal's text in other languages: every t('...'), tx('...'), N_('...')
// and tp(n, '...', '...') of src/ (their English, the dictionaries' keys) against
// each language's dictionary (src/shared/i18n/messages). Lists what a language
// lacks, and keys nothing uses any more; exits 1 if a text is missing.
//   node scripts/i18n.mjs            (npm run i18n)
//   node scripts/i18n.mjs --json     the missing texts, as JSON
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx?|mts)$/.test(e.name) && !p.includes(`${path.sep}messages${path.sep}`)) files.push(p);
  }
})(path.join(root, 'src'));

// a string literal: '...' or "..." (no template literals: a key must be a plain string)
const STR = String.raw`'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"`;
const unescape = (s) => s.replace(/\\(['"\\])/g, '$1').replace(/\\n/g, '\n');
const used = new Map(); // key -> [file:line]
const bad = [];
for (const file of files) {
  // (comment lines aside: their examples aren't texts)
  const src = fs.readFileSync(file, 'utf8').split('\n').map((l) => (/^\s*(\/\/|\*|\/\*)/.test(l) ? '' : l)).join('\n');
  const add = (key, index) => {
    const line = src.slice(0, index).split('\n').length;
    const where = `${path.relative(root, file)}:${line}`;
    used.set(key, [...(used.get(key) ?? []), where]);
  };
  // t('...'), tx('...'), and N_('...'): a text translated later, through a variable (a table of them)
  for (const m of src.matchAll(new RegExp(String.raw`\b(t|tx|N_)\(\s*(?:${STR})`, 'g'))) add(unescape(m[2] ?? m[3]), m.index);
  for (const m of src.matchAll(new RegExp(String.raw`\btp\(\s*[^,]+,\s*(?:${STR})\s*,\s*(?:${STR})`, 'g'))) add(unescape(m[3] ?? m[4]), m.index);
  for (const m of src.matchAll(/\b(t|tx|tp)\(\s*`/g)) bad.push(`${path.relative(root, file)}:${src.slice(0, m.index).split('\n').length}`);
}

const dir = path.join(root, 'src/shared/i18n/messages');
let missing_any = false;
const report = {};
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.ts'))) {
  const lang = f.replace(/\.ts$/, '');
  const text = fs.readFileSync(path.join(dir, f), 'utf8');
  const keys = new Set();
  for (const m of text.matchAll(new RegExp(String.raw`^\s*(?:${STR})\s*:`, 'gm'))) keys.add(unescape(m[1] ?? m[2]));
  const missing = [...used.keys()].filter((k) => !keys.has(k));
  const unused = [...keys].filter((k) => !used.has(k));
  report[lang] = { missing, unused };
  if (missing.length) missing_any = true;
  if (!process.argv.includes('--json')) {
    console.log(`${lang}: ${used.size - missing.length} of ${used.size} texts${missing.length ? `, ${missing.length} missing` : ''}${unused.length ? `, ${unused.length} unused` : ''}`);
    for (const k of missing) console.log(`  missing: ${JSON.stringify(k)}  (${used.get(k)[0]})`);
    for (const k of unused) console.log(`  unused:  ${JSON.stringify(k)}`);
  }
}
if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 1));
for (const b of bad) console.log(`a template literal can't be a key: ${b}`);
process.exit(missing_any || bad.length ? 1 : 0);
