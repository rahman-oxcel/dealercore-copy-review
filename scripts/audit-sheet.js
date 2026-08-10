// Audit every template tab in Ben's workbook for structural consistency,
// so the extractor can rely on a known shape rather than guessing per tab.
const XLSX = require('xlsx');
const path = require('path');

const wb = XLSX.readFile(path.join(__dirname, '..', 'ben_review_sheet.xlsx'), {
  cellStyles: true,
  cellHTML: true,
});

const META = new Set(['Summary', 'Notification Catalogue', 'Signature Guide']);
const tabs = wb.SheetNames.filter((n) => !META.has(n));

// Section headers we expect down column B, in order.
const MARKERS = [
  ['old', /^OLD\s*—\s*Preview/i],
  ['new', /^NEW\s*—\s*Preview/i],
  ['note', /^Bold gold text below/i],
  ['sms', /^NEW\s*—\s*SMS Version/i],
  ['why', /^Why This Changed/i],
  ['sig', /^Signature to Use/i],
];

const rows = [];
let anyRichRuns = 0;
const shapeCounts = {};

for (const name of tabs) {
  const ws = wb.Sheets[name];
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');

  const colB = [];
  for (let R = range.s.r; R <= range.e.r; R++) {
    const cell = ws[XLSX.utils.encode_cell({ r: R, c: 1 })];
    // A rich-text cell has more than one <r> run; a plain one is a single <t>.
    if (cell && cell.r && (String(cell.r).match(/<r>/g) || []).length > 1) anyRichRuns++;
    colB.push(cell && cell.v != null ? String(cell.v) : '');
  }

  const at = {};
  MARKERS.forEach(([key, re]) => {
    const i = colB.findIndex((v) => re.test(v.trim()));
    at[key] = i; // 0-based index into colB
  });

  // A section runs from its own marker to whichever marker comes next, not to a
  // fixed successor -- tabs legitimately omit sections, and a fixed end makes a
  // present section look empty.
  const foundIdx = MARKERS.map(([k]) => at[k]).filter((i) => i >= 0).sort((a, b) => a - b);
  const sectionLines = (key) => {
    const start = at[key];
    if (start < 0) return null; // section genuinely absent
    const next = foundIdx.find((i) => i > start);
    return colB.slice(start + 1, next === undefined ? colB.length : next)
      .filter((v) => v.trim()).length;
  };
  const nonEmptyBetween = (a, b) =>
    a < 0 || b < 0 ? null : colB.slice(a + 1, b).filter((v) => v.trim()).length;

  const meta = {};
  for (let R = range.s.r; R <= Math.min(range.s.r + 8, range.e.r); R++) {
    const k = ws[XLSX.utils.encode_cell({ r: R, c: 1 })];
    const v = ws[XLSX.utils.encode_cell({ r: R, c: 2 })];
    if (k && v && /Original Title|Category|Trigger/i.test(String(k.v))) {
      meta[String(k.v).trim()] = String(v.v).trim();
    }
  }

  const shape = MARKERS.map(([k]) => (at[k] >= 0 ? k : '!' + k)).join(',');
  shapeCounts[shape] = (shapeCounts[shape] || 0) + 1;

  rows.push({
    tab: name,
    origTitle: meta['Original Title'] || '',
    category: meta['Category'] || '',
    hasTrigger: !!meta['Trigger'],
    oldLines: sectionLines('old'),
    // The note row sits inside the NEW section, so count from whichever is later.
    newLines: at.note >= 0 ? sectionLines('note') : sectionLines('new'),
    smsLines: sectionLines('sms'),
    whyLines: sectionLines('why'),
    shapeOk: shape.indexOf('!') === -1,
  });
}

console.log('=== template tabs:', tabs.length, '===');
console.log('=== cells with >1 rich-text run (gold marking survivors):', anyRichRuns, '===');
console.log('\n=== tab shapes ===');
Object.entries(shapeCounts).forEach(([s, n]) => console.log(n + '  ' + s));

const withOld = rows.filter((r) => r.oldLines > 0);
console.log('\n=== tabs with ANY content in the OLD section:', withOld.length, '/', rows.length, '===');
withOld.slice(0, 10).forEach((r) => console.log('  ' + r.tab + ' -> ' + r.oldLines + ' lines'));

console.log('\n=== missing pieces ===');
console.log('no NEW email body :', rows.filter((r) => !r.newLines).map((r) => r.tab).join(', ') || 'none');
console.log('no SMS            :', rows.filter((r) => !r.smsLines).map((r) => r.tab).join(', ') || 'none');
console.log('no WHY CHANGED    :', rows.filter((r) => !r.whyLines).map((r) => r.tab).join(', ') || 'none');
console.log('irregular shape   :', rows.filter((r) => !r.shapeOk).map((r) => r.tab).join(', ') || 'none');

console.log('\n=== category spread ===');
const cats = {};
rows.forEach((r) => (cats[r.category] = (cats[r.category] || 0) + 1));
console.log(JSON.stringify(cats, null, 2));

require('fs').writeFileSync(
  path.join(__dirname, '..', 'audit.json'),
  JSON.stringify(rows, null, 2)
);
console.log('\nwrote audit.json');
