// Pull the 90 existing templates out of the dev team's documentation HTML:
// metadata plus the raw Blade source, which is the only surviving record of the
// current copy (the review sheet's OLD column is empty on every tab).
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const SRC = 'C:\\Users\\rahma\\Downloads\\emails_documentation (1) (1).html';
const $ = cheerio.load(fs.readFileSync(SRC, 'utf8'));

const out = [];
$('section[id]').each((_, el) => {
  const $s = $(el);
  const id = $s.attr('id');
  const title = $s.find('h3').first().text().trim();
  const category = $s.find('span').first().text().trim();

  // Each section labels its fields; read by label rather than by position.
  const byLabel = {};
  $s.find('label').each((__, l) => {
    const key = $(l).text().trim();
    byLabel[key] = $(l).parent();
  });

  const filePath = byLabel['File Path'] ? byLabel['File Path'].find('code').text().trim() : '';
  const trigger = byLabel['Trigger'] ? byLabel['Trigger'].find('p').text().trim() : '';
  const blade = $s.find('pre code').first().text(); // cheerio decodes entities

  out.push({ id, title, category, filePath, trigger, blade });
});

fs.writeFileSync(
  path.join(__dirname, '..', 'old_raw.json'),
  JSON.stringify(out, null, 2)
);

console.log('sections extracted:', out.length);
console.log('missing blade   :', out.filter((t) => !t.blade.trim()).map((t) => t.id).join(', ') || 'none');
console.log('missing filePath:', out.filter((t) => !t.filePath).map((t) => t.id).join(', ') || 'none');

const lens = out.map((t) => t.blade.length).sort((a, b) => a - b);
console.log('blade length  min/median/max:', lens[0], lens[Math.floor(lens.length / 2)], lens[lens.length - 1]);

// Structural variety drives how hard the copy extraction has to work.
const feat = { table: 0, ul: 0, button: 0, img: 0, blade_if: 0, blade_loop: 0, inline_style: 0 };
out.forEach((t) => {
  const b = t.blade;
  if (/<table/i.test(b)) feat.table++;
  if (/<ul|<li/i.test(b)) feat.ul++;
  if (/<a[^>]+href/i.test(b)) feat.button++;
  if (/<img/i.test(b)) feat.img++;
  if (/@if|@endif/.test(b)) feat.blade_if++;
  if (/@foreach|@forelse/.test(b)) feat.blade_loop++;
  if (/style="/i.test(b)) feat.inline_style++;
});
console.log('structural features across 90:', JSON.stringify(feat, null, 2));

console.log('\n--- shortest template, verbatim ---');
const shortest = out.reduce((a, b) => (a.blade.length <= b.blade.length ? a : b));
console.log(shortest.id, '|', shortest.filePath);
console.log(shortest.blade.slice(0, 1200));
