// Finds every cluster like Proposal Finalised: more templates in v0.1 than the
// dev team lists notifications for, or two templates whose replacement copy says
// the same thing to the same person.
//
//   node scripts/find-redundant.js <v0.2.xlsx>
//
// Identification uses the LIVE copy against v0.2, which is the owner's method:
// v0.2 describes what production sends today, so the live side is the key.
// Duplication uses the NEW copy, because that is what would ship.
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.join(__dirname, '..');
const R = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const olds = R('old_templates.json');
const { templates } = R('new_templates.json');
const { rows: joinRows } = R('join_map.json');

const show = (t) => t.displayName || t.tab;
const oldById = new Map(olds.map((o) => [o.id, o]));
const oldOf = new Map();
joinRows.forEach((r) => { if (r.oldId) oldOf.set(r.tab, oldById.get(r.oldId)); });

const STOP = new Set(('the a an and or of to for your you we our is are be been being has have had will would with in on at it if any all please thank thanks this that as from by not no can could may might yours their there them they team dear hi hello regards email mail send sent us out get one more also so do does when what which who how why about into over under after before now new').split(' '));
const bag = (s) => new Set(String(s)
  .replace(/\{\{[\s\S]*?\}\}/g, ' ').replace(/\{!![\s\S]*?!!\}/g, ' ')
  .replace(/\[[^\]]*\]/g, ' ').replace(/@\w+\s*(\([^)]*\))?/g, ' ')
  .toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)
  .filter((w) => w.length > 3 && !STOP.has(w)));
const sim = (a, b) => { if (a.size < 5 || b.size < 5) return 0; let n = 0; a.forEach((w) => { if (b.has(w)) n++; }); return n / Math.min(a.size, b.size); };

const wb = XLSX.readFile(process.argv[2]);
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Combined'], { header: 1, blankrows: false, defval: '' })
  .slice(1).map((r, i) => ({ row: i + 2, mod: r[0], act: r[2], to: r[4], bag: bag(r[3]) }));

// --- 1. which v0.2 notification does each live template answer to
const claim = new Map();
templates.forEach((t) => {
  const o = oldOf.get(t.tab);
  if (!o) return;
  const ob = bag((o.subject || '') + ' ' + (o.copyText || ''));
  let best = null, s = 0;
  rows.forEach((r) => { const v = sim(ob, r.bag); if (v > s) { s = v; best = r; } });
  if (!best || s < 0.45) return;
  if (!claim.has(best.row)) claim.set(best.row, { r: best, who: [] });
  claim.get(best.row).who.push({ n: show(t), to: t.channels.recipient, s, redundant: !!t.redundant });
});

console.log('=== v0.2 notifications that more than one v0.1 template answers to');
let n = 0;
[...claim.values()].filter((c) => c.who.length > 1)
  .sort((a, b) => b.who.length - a.who.length || a.r.row - b.r.row)
  .forEach((c) => {
    n++;
    console.log('\n  row ' + c.r.row + '  [' + c.r.mod + '] ' + c.r.act);
    console.log('        to ' + c.r.to);
    c.who.sort((x, y) => y.s - x.s).forEach((w) =>
      console.log('        ' + w.s.toFixed(2) + '  ' + w.n.padEnd(34) + ' to ' + w.to + (w.redundant ? '   ALREADY RETIRED' : '')));
  });
if (!n) console.log('  none');

// --- 2. replacement copy that says the same thing to the same person
console.log('\n\n=== v0.1 pairs whose NEW copy overlaps, same recipient');
const live = templates.filter((t) => (t.body || []).length && !t.isLayout);
const nb = new Map(live.map((t) => [t.tab, bag([t.subject, ...t.body].join(' '))]));
const pairs = [];
for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
  const A = live[i], B = live[j];
  if (A.channels.recipient !== B.channels.recipient) continue;
  const s = sim(nb.get(A.tab), nb.get(B.tab));
  if (s >= 0.5) pairs.push({ s, a: show(A), b: show(B), to: A.channels.recipient });
}
pairs.sort((x, y) => y.s - x.s).forEach((p) =>
  console.log('  ' + p.s.toFixed(2) + '  ' + p.a.padEnd(32) + ' vs ' + p.b.padEnd(32) + ' (' + p.to + ')'));
if (!pairs.length) console.log('  none above 0.50');
