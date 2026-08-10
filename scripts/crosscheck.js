// Cross-check: does each tab's actual SMS copy match what the Notification
// Catalogue claims the channel set is? Mismatches are dev-facing defects.
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const wb = XLSX.readFile(path.join(__dirname, '..', 'ben_review_sheet.xlsx'));
const audit = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'audit.json'), 'utf8'));

// The catalogue tab holds four stacked blocks; the per-template channel matrix
// is the last one, so locate its header rather than assuming row 1.
const grid = XLSX.utils.sheet_to_json(wb.Sheets['Notification Catalogue'], {
  header: 1, defval: '', blankrows: true,
});
const hdr = grid.findIndex((r) => String(r[1]).trim() === 'Template (Tab Name)');
if (hdr < 0) throw new Error('channel matrix header not found');
console.log('channel matrix header at row index', hdr);

const key = (s) => String(s).replace(/[^a-z0-9]/gi, '').toLowerCase();
const claims = new Map();
for (let i = hdr + 1; i < grid.length; i++) {
  const r = grid[i];
  const name = String(r[1] || '').trim();
  if (!name) continue;
  claims.set(key(name), {
    name,
    email: !!String(r[3]).trim(),
    sms: !!String(r[4]).trim(),
    push: !!String(r[5]).trim(),
    internal: !!String(r[6]).trim(),
    recipient: String(r[7] || '').trim(),
  });
}

console.log('catalogue rows:', claims.size, ' audited tabs:', audit.length);

const missingFromCat = [];
const smsClaimedNotWritten = [];
const smsWrittenNotClaimed = [];

audit.forEach((t) => {
  const c = claims.get(key(t.tab));
  if (!c) { missingFromCat.push(t.tab); return; }
  const written = !!t.smsLines;
  if (c.sms && !written) smsClaimedNotWritten.push(t.tab);
  if (!c.sms && written) smsWrittenNotClaimed.push(t.tab);
});

console.log('\n--- tabs absent from the catalogue ---');
console.log(missingFromCat.join(', ') || 'none');

console.log('\n--- catalogue says SMS, but NO SMS copy written (' + smsClaimedNotWritten.length + ') ---');
console.log(smsClaimedNotWritten.join(', ') || 'none');

console.log('\n--- SMS copy written, but catalogue says NO SMS (' + smsWrittenNotClaimed.length + ') ---');
console.log(smsWrittenNotClaimed.join(', ') || 'none');

const recip = {};
[...claims.values()].forEach((c) => (recip[c.recipient] = (recip[c.recipient] || 0) + 1));
console.log('\n--- recipient spread ---');
console.log(JSON.stringify(recip));
const chan = { email: 0, sms: 0, push: 0, internal: 0 };
[...claims.values()].forEach((c) => Object.keys(chan).forEach((k) => c[k] && chan[k]++));
console.log('--- channel spread ---');
console.log(JSON.stringify(chan));
