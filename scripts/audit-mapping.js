// Audits the mapping written into v0.2's Combined tab against v0.1.
// Checks three things the eye cannot: every link resolves to a real section,
// no template is claimed by two rows without reason, and every row marked
// Matched actually shares wording with the template it points at.
//
//   node scripts/audit-mapping.js <v0.2.xlsx>
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const R = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'));
const olds = R('old_templates.json');
const { templates: news } = R('new_templates.json');
const { rows: joinRows } = R('join_map.json');
const html = fs.readFileSync(path.join(__dirname, '..', 'DealerCore-Reviewed-Copy.html'), 'utf8');

const slug = (s) => 't-' + String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const bySlug = new Map(news.map((n) => [slug(n.tab), n]));
const oldByTab = new Map();
joinRows.forEach((r) => { if (r.oldId) oldByTab.set(r.tab, olds.find((o) => o.id === r.oldId)); });

// Section ids actually emitted into the page.
const pageIds = new Set((html.match(/id="(t-[a-z0-9-]+)"/g) || []).map((m) => m.slice(4, -1)));

const STOP = new Set(('the a an and or of to for your you we our is are be been being has have had will would with in on at it if any all please thank thanks this that as from by not no can could may might yours their there them they team dear hi hello regards email mail send sent us out get one more also so do does when what which who how why about into over under after before now new').split(' '));
const bag = (s) => new Set(String(s)
  .replace(/\{\{[\s\S]*?\}\}/g, ' ').replace(/\{!![\s\S]*?!!\}/g, ' ')
  .replace(/\[[^\]]*\]/g, ' ').replace(/@\w+\s*(\([^)]*\))?/g, ' ')
  .toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)
  .filter((w) => w.length > 3 && !STOP.has(w)));
const overlap = (a, b) => {
  if (!a.size || !b.size) return { s: 0, n: 0 };
  let n = 0; a.forEach((w) => { if (b.has(w)) n++; });
  return { s: n / Math.min(a.size, b.size), n };
};

const wb = XLSX.readFile(process.argv[2]);
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Combined'], { header: 1, blankrows: false, defval: '' }).slice(1);

const problems = [];
const linkUse = new Map();
let matched = 0, weak = [];

rows.forEach((r, i) => {
  const rowNo = i + 2;
  const [module, sendBy, action, content, to, status, link] = r.map((x) => String(x || '').trim());

  if (!status) problems.push('row ' + rowNo + ': no status');

  const sl = link ? link.split('#')[1] : '';
  if (link) {
    if (!sl) problems.push('row ' + rowNo + ': link has no fragment');
    else {
      if (!bySlug.has(sl)) problems.push('row ' + rowNo + ' (' + action + '): link #' + sl + ' matches no template');
      if (!pageIds.has(sl)) problems.push('row ' + rowNo + ' (' + action + '): #' + sl + ' is not a section on the page');
      if (!linkUse.has(sl)) linkUse.set(sl, []);
      linkUse.get(sl).push(rowNo + ' ' + action);
    }
  }

  // A row with a status that implies a match must carry a link, and vice versa.
  if (status === 'Matched' && !link) problems.push('row ' + rowNo + ' (' + action + '): Matched but no link');
  if (status === 'Only in v0.2' && link) problems.push('row ' + rowNo + ' (' + action + '): Only in v0.2 but has a link');
  if (status === 'Only in v0.1' && !link) problems.push('row ' + rowNo + ' (' + action + '): Only in v0.1 but no link');
  if (status === 'Partially Matched' && link) problems.push('row ' + rowNo + ' (' + action + '): Partially Matched should stay unlinked');

  // The real test: does a Matched row share wording with the old template?
  if (status === 'Matched' && sl && bySlug.has(sl)) {
    matched++;
    const n = bySlug.get(sl);
    const o = oldByTab.get(n.tab);
    const devBag = bag(content === 'See v0.1 for current and revised copy.' ? '' : content);
    // Compare against the LIVE copy, which is what v0.2 describes.
    const oldBag = o ? bag((o.subject || '') + ' ' + (o.copyText || '')) : new Set();
    const res = overlap(devBag, oldBag);
    if (devBag.size >= 6 && oldBag.size >= 6 && res.s < 0.45) {
      weak.push({ rowNo, action, name: n.displayName || n.tab, s: res.s, n: res.n });
    }
  }
});

console.log('rows audited            : ' + rows.length);
console.log('Matched rows with links : ' + matched);
console.log('distinct templates linked: ' + linkUse.size + ' of ' + news.length);

console.log('\n--- templates linked from more than one row');
let dup = 0;
linkUse.forEach((who, sl) => {
  if (who.length > 1) { dup++; console.log('  #' + sl + '\n      ' + who.join('\n      ')); }
});
if (!dup) console.log('  none');

console.log('\n--- v0.1 templates no row links to (' +
  news.filter((n) => !linkUse.has(slug(n.tab))).length + ')');
news.filter((n) => !linkUse.has(slug(n.tab)))
  .forEach((n) => console.log('  ' + (n.displayName || n.tab)));

console.log('\n--- Matched rows with weak wording overlap (' + weak.length + ')');
weak.sort((a, b) => a.s - b.s).forEach((w) => console.log('  ' + w.s.toFixed(2) + ' n=' + String(w.n).padEnd(3) +
  'row ' + w.rowNo + '  ' + w.action + '  ->  ' + w.name));

console.log('\n--- structural problems (' + problems.length + ')');
problems.forEach((p) => console.log('  ' + p));
