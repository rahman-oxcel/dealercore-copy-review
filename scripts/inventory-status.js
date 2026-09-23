// Reads the Inventory (v0.2) and writes data/inventory.json: for every v0.1
// template, the status the sheet gives it and the sheet row it sits on, so the
// two artefacts can be read side by side.
//
//   node scripts/inventory-status.js <v0.2.xlsx>
//
// Rows carrying a link attribute themselves. A Partially Matched row links to
// nothing on purpose (it covers several templates at once), so its candidates
// are read back out of data/register.csv, where the adjudication is recorded.
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.join(__dirname, '..');
const { templates: news } = JSON.parse(fs.readFileSync(path.join(ROOT, 'new_templates.json'), 'utf8'));
const slug = (s) => 't-' + String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const tabBySlug = new Map(news.map((n) => [slug(n.tab), n.tab]));
const shown = (n) => n.displayName || n.tab;
const tabByName = new Map(news.map((n) => [shown(n), n.tab]));

const wb = XLSX.readFile(process.argv[2]);
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Combined'],
  { header: 1, blankrows: false, defval: '' }).slice(1);

const out = {};
const add = (tab, status, row) => {
  if (!tab) return;
  const e = (out[tab] = out[tab] || { status, rows: [] });
  e.status = status;
  if (e.rows.indexOf(row) < 0) e.rows.push(row);
};

// Pass one: anything the sheet links to says so itself.
rows.forEach((r, i) => {
  const sheetRow = i + 2; // the header occupies row 1
  const status = String(r[5] || '').trim();
  const sl = String(r[6] || '').trim().split('#')[1] || '';
  add(tabBySlug.get(sl), status, sheetRow);
});

// Pass two: the unlinked rows cover several templates each. The register holds
// which, so read the candidates back rather than guessing from wording again.
function parseCsv(text) {
  const table = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); table.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur || row.length) { row.push(cur); table.push(row); }
  return table;
}
const csv = parseCsv(fs.readFileSync(path.join(ROOT, 'data', 'register.csv'), 'utf8'));
const head = csv[0];
csv.slice(1).filter((r) => r.length === head.length).forEach((r) => {
  const rec = Object.fromEntries(head.map((h, i) => [h, r[i]]));
  if (!rec.ref) return;
  const m = /^Candidates:\s*(.+?)\.\s*Confirm/.exec(rec.note || '');
  if (!m) return;
  const sheetRow = Number(rec.ref.replace('DEV-', '')) + 1;
  const status = (rows[sheetRow - 2] && String(rows[sheetRow - 2][5] || '').trim()) || 'Partially Matched';
  m[1].split(' / ').forEach((name) => add(tabByName.get(name.trim()), status, sheetRow));
});

fs.writeFileSync(path.join(ROOT, 'data', 'inventory.json'), JSON.stringify(out, null, 2) + '\n');

const tally = {};
Object.values(out).forEach((v) => { tally[v.status] = (tally[v.status] || 0) + 1; });
console.log('data/inventory.json  (' + Object.keys(out).length + ' of ' + news.length + ' templates)');
Object.entries(tally).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('  ' + String(v).padStart(3) + '  ' + k));
const missing = news.filter((n) => !out[n.tab]).map(shown);
console.log('  ' + String(missing.length).padStart(3) + '  no entry');
if (missing.length) missing.forEach((x) => console.log('        ' + x));
