// Emits what goes into the Combined tab of v0.2: a Status and a Link for each
// of its 88 rows, plus the 17 rows that exist only in v0.1.
// Output is Google Sheets array literals, so each column is one cell entry that
// spills, rather than 88 separate typings.
//
//   node scripts/sheet-payload.js <v0.2.xlsx>
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REG = path.join(__dirname, '..', 'data', 'register.csv');
if (!fs.existsSync(REG)) throw new Error('run scripts/register.js first');

// Parse the register back out rather than recompute the matching.
function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
const csv = parseCsv(fs.readFileSync(REG, 'utf8'));
const head = csv[0];
const recs = csv.slice(1).filter((r) => r.length === head.length)
  .map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));

const BASE = 'https://rahman-oxcel.github.io/dealercore-copy-review/#';
const slug = (s) => 't-' + String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const STATUS = { CERTAIN: 'Matched', PROBABLE: 'Matched', AMBIGUOUS: 'Partially Matched', GAP: 'Only in v0.2' };

// --- the 88 existing rows, in sheet order (DEV-001 .. DEV-088)
const devRows = recs.filter((r) => r.ref).sort((a, b) => a.ref.localeCompare(b.ref));
if (devRows.length !== 88) throw new Error('expected 88 dev rows, got ' + devRows.length);

const statuses = devRows.map((r) => STATUS[r.coverage] || '');
const links = devRows.map((r) => (r.ourTab ? BASE + slug(r.ourTab) : ''));

// --- the 17 rows that exist only in v0.1
const MODULE = {
  'Signup': 'Authentication', 'Signup Approve': 'Authentication',
  'Signup Reject': 'Authentication', 'Signup Response': 'Authentication',
  'New Device or Unusual Login': 'Authentication',
  'Consignment Sold': 'Consignment',
  'Invoice Quote': 'Billing', 'Transaction': 'Wallet', 'Low Wallet Balance': 'Wallet',
  'Sale Contract': 'Quotation',
  'After Launch Review': 'Test Drive', 'Testdrive Completion': 'Test Drive',
  'Reschedule Confirmation': 'Test Drive',
  'System Notification': 'System',
  'Deposit Received': 'Vehicle Sales', 'Delivery Reminder': 'Vehicle Sales',
  'Finance Settled': 'Finance',
};
const news = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'new_templates.json'), 'utf8')).templates;
const byName = new Map(news.map((n) => [n.displayName || n.tab, n]));
const SENDBY = (r) => (['Customer', 'Consignor', 'Seller'].indexOf(r) >= 0 ? 'Dealer to Customer'
  : r === 'Dealer' ? 'System to Dealer' : 'Internal Staff & Admin');

const extras = recs.filter((r) => r.coverage === 'NOT IN DEV LIST' || r.coverage === 'PROPOSED')
  .map((r) => {
    const n = byName.get(r.ourName) || news.find((x) => x.tab === r.ourTab);
    return {
      module: MODULE[r.ourName] || '',
      sendBy: n ? SENDBY(n.channels.recipient) : '',
      action: r.ourName,
      content: r.coverage === 'PROPOSED' ? 'New copy written in v0.1. No live template.' : 'See v0.1 for current and revised copy.',
      to: n ? n.channels.recipient : '',
      status: 'Only in v0.1',
      link: BASE + slug(r.ourTab),
    };
  });

const lit = (arr) => '{' + arr.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(';') + '}';

console.log('=== F2  (Status, 88 rows) ===');
console.log('=' + lit(statuses));
console.log('\n=== G2  (Link, 88 rows) ===');
console.log('=' + lit(links));
console.log('\n=== A90  (the ' + extras.length + ' rows only in v0.1, cols A-G) ===');
console.log('=' + '{' + extras.map((e) => [e.module, e.sendBy, e.action, e.content, e.to, e.status, e.link]
  .map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join(';') + '}');

const tally = {};
statuses.forEach((s) => { tally[s] = (tally[s] || 0) + 1; });
tally['Only in v0.1'] = extras.length;
console.log('\n=== tally ===');
Object.entries(tally).forEach(([k, v]) => console.log('  ' + String(v).padStart(3) + '  ' + (k || '(blank)')));
console.log('  total rows after append: ' + (88 + extras.length + 1));
