// Join the 90 existing Blade templates to the 100 reviewed tabs.
// Excel truncates tab names at 31 chars, and Ben renamed titles, so matching
// runs through several keys before anything is declared new.
const fs = require('fs');
const path = require('path');

const olds = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'old_templates.json'), 'utf8'));
const { templates: news, reference } = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'new_templates.json'), 'utf8')
);

const norm = (s) => String(s || '').replace(/[^a-z0-9]/gi, '').toLowerCase();

// Tab names are capped at 31 chars by Excel; compare on that prefix too.
const trunc = (s) => norm(s).slice(0, 31);

const oldByKey = new Map();
const indexOld = (k, o) => {
  if (!k) return;
  if (!oldByKey.has(k)) oldByKey.set(k, o);
};
olds.forEach((o) => {
  indexOld(norm(o.title), o);
  indexOld(norm(o.id), o);
  indexOld(trunc(o.title), o);
});

const used = new Set();
const rows = news.map((n) => {
  const candidates = [
    ['tab', norm(n.tab)],
    ['renamedFrom', norm(n.renamedFrom)],
    ['originalTitle', norm(n.originalTitle)],
    ['tab~31', trunc(n.tab)],
  ];

  let match = null, via = null;
  for (const [label, key] of candidates) {
    if (!key) continue;
    const o = oldByKey.get(key);
    if (o && !used.has(o.id)) { match = o; via = label; break; }
  }
  // Last resort: a tab name that is a prefix of exactly one old title.
  if (!match) {
    const k = norm(n.tab);
    const hits = olds.filter((o) => !used.has(o.id) && norm(o.title).startsWith(k) && k.length >= 12);
    if (hits.length === 1) { match = hits[0]; via = 'prefix'; }
  }
  if (match) used.add(match.id);

  const renamed = !!match && norm(match.title) !== norm(n.tab);
  return {
    tab: n.tab,
    oldId: match ? match.id : null,
    oldTitle: match ? match.title : null,
    filePath: match ? match.filePath : null,
    matchedVia: via,
    status: !match ? 'NEW' : renamed ? 'RENAMED' : 'MATCHED',
  };
});

const unmatchedOld = olds.filter((o) => !used.has(o.id));

const counts = rows.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
console.log('=== join result ===');
console.log(JSON.stringify(counts, null, 2));
console.log('matched via:', JSON.stringify(
  rows.filter((r) => r.matchedVia).reduce((a, r) => ((a[r.matchedVia] = (a[r.matchedVia] || 0) + 1), a), {})
));

console.log('\n--- NEW (no prior template) ---');
rows.filter((r) => r.status === 'NEW').forEach((r) => console.log('  ' + r.tab));

console.log('\n--- RENAMED (title changed) ---');
rows.filter((r) => r.status === 'RENAMED').forEach((r) =>
  console.log('  ' + (r.oldTitle || '').padEnd(46) + ' ->  ' + r.tab + '   [' + r.matchedVia + ']'));

console.log('\n--- OLD templates with no reviewed tab (' + unmatchedOld.length + ') ---');
unmatchedOld.forEach((o) => console.log('  ' + o.id + '  "' + o.title + '"'));

fs.writeFileSync(path.join(__dirname, '..', 'join_map.json'),
  JSON.stringify({ rows, unmatchedOld: unmatchedOld.map((o) => ({ id: o.id, title: o.title })) }, null, 2));
console.log('\nwrote join_map.json');
