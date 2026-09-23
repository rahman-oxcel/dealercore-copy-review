// Reconciles the dev team's notification inventory against the reviewed set and
// writes data/register.csv, the standing record of what exists and what we cover.
// Re-run whenever either side changes; the DRIFT list at the end is the point.
//
//   node scripts/register.js <devlist.xlsx>
//
// ADJUDICATED holds the pairings word overlap cannot settle on its own. Some of
// our templates are two lines of Blade ({{ $messageText }} and nothing else) and
// score near zero against a full description; and one dev row often covers
// several of ours. Every entry here was checked by hand against both sources.
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const R = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'));
const olds = R('old_templates.json');
const { templates: news } = R('new_templates.json');
const { rows: joinRows } = R('join_map.json');
const overrides = R('data/overrides.json');

const ADJUDICATED = {
  // Covered, but too short or too generic to match on words.
  // 2 / 25 tie at 1.00 against a sibling (cancellation, proposal lost) because
  // the pair share almost every word; 22's template is four lines long.
  2: 'appointment_status', 22: 'send_lead_mail', 25: 'proposal_open',
  7: 'external', 20: 'external', 35: 'billing_bill',
  47: 'subscription_plan_expired', 55: 'rego_channel_update', 61: 'invoice',
  63: 'vehicle_inspection', 68: 'appointment_reminder', 74: 'dealer_review',
  // Nothing on our side at all: no Blade view, no reviewed template.
  10: 'GAP', 12: 'GAP', 21: 'GAP', 56: 'GAP', 60: 'GAP', 73: 'GAP', 83: 'GAP', 84: 'GAP',
  // One dev row, several of ours, or no confident read either way.
  6: 'AMBIGUOUS:consignment_consignment_vehicle_sold|consignment_sold_purchase',
  13: 'AMBIGUOUS:quotation_made|quotation_booking',
  16: 'AMBIGUOUS:returned_returned|vehicle_returned',
  26: 'AMBIGUOUS:proposal_finalised|sold_sold',
  // "Sold Mail", with no copy behind it in the inventory. v0.1 holds two
  // near-identical sold emails and nothing says which one this is.
  28: 'AMBIGUOUS:vehicle_sold|sold_sold',
  41: 'AMBIGUOUS:finance_status|finance_declined_status|finance_withdrawn',
  14: 'AMBIGUOUS', 36: 'AMBIGUOUS', 58: 'AMBIGUOUS', 59: 'AMBIGUOUS',
  62: 'AMBIGUOUS', 71: 'AMBIGUOUS',
};

const tabOf = new Map();
joinRows.forEach((r) => { if (r.oldId) tabOf.set(r.oldId, r.tab); });
const byTab = new Map(news.map((n) => [n.tab, n]));
const meta = new Map(olds.map((o) => {
  const tab = tabOf.get(o.id) || '';
  const n = tab ? byTab.get(tab) : null;
  return [o.id, {
    id: o.id,
    tab,
    file: o.filePath || '',
    name: n ? (n.displayName || n.tab) : (tab || '(unjoined)'),
    status: !tab ? 'UNJOINED' : !n ? 'WITHDRAWN' : n.isLayout ? 'LAYOUT'
      : n.redundant ? 'REDUNDANT' : 'REVISED',
    oldSubject: o.subject || '',
  }];
}));

const STOP = new Set(('the a an and or of to for your you we our is are be been being has have had ' +
  'will would with in on at it if any all please thank thanks this that as from by not no can could ' +
  'may might yours their there them they team dear hi hello regards email mail send sent us out get ' +
  'one more also so do does when what which who how why about into over under after before now new').split(' '));
const bag = (s) => new Set(String(s)
  .replace(/\{\{[\s\S]*?\}\}/g, ' ')
  .replace(/\{!![\s\S]*?!!\}/g, ' ')
  .replace(/\[[^\]]*\]/g, ' ')
  .replace(/@\w+\s*(\([^)]*\))?/g, ' ')
  .toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)
  .filter((w) => w.length > 3 && !STOP.has(w)));
const bags = new Map(olds.map((o) => [o.id, bag((o.subject || '') + ' ' + (o.copyText || ''))]));

// A bag under six words "contains" every other one, so score it zero rather
// than let a two-word template match the whole set at 1.00.
function best(b) {
  let id = null, s = 0;
  bags.forEach((ob, oid) => {
    if (b.size < 6 || ob.size < 6) return;
    let n = 0;
    b.forEach((w) => { if (ob.has(w)) n++; });
    const v = n / Math.min(b.size, ob.size);
    if (v > s) { s = v; id = oid; }
  });
  return { id, s };
}

const wb = XLSX.readFile(process.argv[2]);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],
  { header: 1, blankrows: false, defval: '' }).slice(1);

const out = [];
const claimed = new Set();

rows.forEach((r, i) => {
  const n = i + 1;
  const subject = (String(r[3]).match(/Subject:\s*(.+)/) || [, ''])[1].trim();
  const adj = ADJUDICATED[n];
  const auto = best(bag(r[3]));
  let id = '', conf = '', note = '';

  if (adj === 'GAP') {
    conf = 'GAP';
    note = 'No Blade view and no reviewed template. Not covered by the review.';
  } else if (adj && adj.indexOf('AMBIGUOUS') === 0) {
    conf = 'AMBIGUOUS';
    const list = adj.split(':')[1];
    if (list) {
      note = 'Candidates: ' + list.split('|').map((x) => meta.get(x).name).join(' / ') +
        '. Confirm which of these actually sends.';
      list.split('|').forEach((x) => claimed.add(x));
    } else {
      note = 'No confident match. Confirm whether this is one of ours or a separate send.';
    }
  } else if (adj) {
    id = adj; conf = 'CERTAIN';
    note = 'Adjudicated by hand (template too short to match on words).';
  } else if (auto.s >= 0.70) {
    id = auto.id; conf = 'CERTAIN';
  } else if (auto.s >= 0.45) {
    id = auto.id; conf = 'PROBABLE';
    note = 'Word overlap ' + auto.s.toFixed(2) + '. Worth a glance.';
  } else {
    conf = 'AMBIGUOUS';
    note = 'Best guess ' + (auto.id ? meta.get(auto.id).name : '-') + ' at ' + auto.s.toFixed(2) + '.';
  }

  if (id) claimed.add(id);
  const m = id ? meta.get(id) : null;
  out.push({
    ref: 'DEV-' + String(n).padStart(3, '0'),
    module: r[0], sendBy: r[1], action: r[2],
    devSubject: subject, devRecipient: r[4],
    ourName: m ? m.name : '', ourTab: m ? m.tab : '', ourFile: m ? m.file : '',
    ourStatus: m ? m.status : '',
    oldSubjectKnown: m ? (m.oldSubject ? 'yes' : 'no') : '',
    coverage: conf, note,
  });
});

const extra = [];
olds.forEach((o) => {
  if (claimed.has(o.id)) return;
  const m = meta.get(o.id);
  extra.push({
    ref: '', module: '', sendBy: '', action: '', devSubject: '', devRecipient: '',
    ourName: m.name, ourTab: m.tab, ourFile: m.file, ourStatus: m.status,
    oldSubjectKnown: m.oldSubject ? 'yes' : 'no',
    coverage: 'NOT IN DEV LIST',
    note: 'Reviewed, but the dev inventory has no row for it. Confirm it still sends.',
  });
});

const joinedTabs = new Set(joinRows.filter((r) => r.oldId).map((r) => r.tab));
news.filter((n) => !joinedTabs.has(n.tab)).forEach((n) => extra.push({
  ref: '', module: '', sendBy: '', action: '', devSubject: '', devRecipient: '',
  ourName: n.displayName || n.tab, ourTab: n.tab, ourFile: '', ourStatus: 'NEW',
  oldSubjectKnown: '', coverage: 'PROPOSED',
  note: 'Written during the review. Does not exist in production yet.',
}));

Object.entries(overrides).filter(([, v]) => v.drop).forEach(([k]) => extra.push({
  ref: '', module: '', sendBy: '', action: '', devSubject: '', devRecipient: '',
  ourName: k, ourTab: k, ourFile: '', ourStatus: 'WITHDRAWN', oldSubjectKnown: '',
  coverage: 'WITHDRAWN', note: 'Proposal rejected by the owner. Not in the deliverable.',
}));

const all = out.concat(extra);
const COLS = ['ref', 'module', 'sendBy', 'action', 'devSubject', 'devRecipient',
  'ourName', 'ourTab', 'ourFile', 'ourStatus', 'oldSubjectKnown', 'coverage', 'note'];
const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
fs.writeFileSync(path.join(__dirname, '..', 'data', 'register.csv'),
  COLS.join(',') + '\n' + all.map((r) => COLS.map((c) => q(r[c])).join(',')).join('\n') + '\n');

const tally = {};
all.forEach((r) => { tally[r.coverage] = (tally[r.coverage] || 0) + 1; });
console.log('data/register.csv  (' + all.length + ' rows)\n');
Object.entries(tally).sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => console.log('  ' + String(v).padStart(3) + '  ' + k));

console.log('\n--- DRIFT: rows that need an answer');
all.filter((r) => ['GAP', 'AMBIGUOUS', 'NOT IN DEV LIST'].indexOf(r.coverage) >= 0)
  .forEach((r) => console.log('  ' + r.coverage.padEnd(16) + (r.ref || '       ') + '  ' +
    (r.action || r.ourName)));
