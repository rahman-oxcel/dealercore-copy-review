// Ben's "Why This Changed" notes repeat the same handful of reasons across
// templates. Find the recurring ones so they can be stated once, up top.
const fs = require('fs');
const path = require('path');

const { templates } = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'new_templates.json'), 'utf8')
);

// Collapse the specifics so wording variants of the same reason group together.
const norm = (s) =>
  s.toLowerCase()
    .replace(/["'“”‘’]/g, '')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const all = [];
templates.forEach((t) => t.why.forEach((w) => all.push({ tab: t.tab, w, n: norm(w) })));

const byExact = {};
all.forEach((x) => (byExact[x.n] = byExact[x.n] || []).push(x));

const ranked = Object.entries(byExact)
  .map(([n, list]) => ({ n, count: list.length, sample: list[0].w }))
  .sort((a, b) => b.count - a.count);

console.log('total bullets:', all.length, '| distinct:', ranked.length);
console.log('\n--- every distinct reason ---');
ranked.forEach((r) =>
  console.log(String(r.count).padStart(3) + '×  ' + r.sample.replace(/\s+/g, ' ').slice(0, 155)));

const repeated = ranked.filter((r) => r.count >= 3).reduce((a, r) => a + r.count, 0);
console.log('\nbullets covered by 3+ reasons :', repeated, '(' + Math.round((repeated / all.length) * 100) + '% of all bullets)');
console.log('one-off bullets remaining     :', all.length - repeated);

console.log('\n--- keyword themes ---');
const THEMES = [
  ['hardcoded name', /hardcoded|specific (person|salesperson|staff|user)s? ?name/i],
  ['hardcoded number', /mobile number|phone number/i],
  ['australian english', /australian english|spelling/i],
  ['tidied wording', /tidied|reworded|warmer|clearer|plain/i],
  ['placeholder added', /placeholder/i],
  ['signature', /signature|sign-?off/i],
  ['subject line', /subject/i],
];
THEMES.forEach(([label, re]) => {
  const hits = all.filter((x) => re.test(x.w));
  console.log(String(hits.length).padStart(4) + '  ' + label);
});
