// Inspect Ben's review workbook: sheet names + a full dump of one template tab,
// including rich-text runs so we can see the bold/gold change marking.
const XLSX = require('xlsx');
const path = require('path');

const wb = XLSX.readFile(path.join(__dirname, '..', 'ben_review_sheet.xlsx'), {
  cellStyles: true,
  cellHTML: true,
});

console.log('=== SHEET COUNT:', wb.SheetNames.length, '===');
console.log(JSON.stringify(wb.SheetNames, null, 0));

const target = process.argv[2] || 'Consignment Sold';
const ws = wb.Sheets[target];
if (!ws) {
  console.log('\n!! sheet not found:', target);
  process.exit(0);
}

console.log('\n=== DUMP:', target, '=== range:', ws['!ref']);
const range = XLSX.utils.decode_range(ws['!ref']);
for (let R = range.s.r; R <= range.e.r; R++) {
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: R, c: C });
    const cell = ws[addr];
    if (!cell) continue;
    const out = { addr, v: cell.v };
    if (cell.r) out.richXml = String(cell.r).slice(0, 900);
    if (cell.h && cell.h !== cell.v) out.html = String(cell.h).slice(0, 900);
    console.log(JSON.stringify(out));
  }
}
