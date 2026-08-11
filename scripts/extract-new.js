// Pull the reviewed copy out of Ben's workbook: one record per template tab,
// plus the reference tabs (channel matrix, signature rules, governance notes).
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const wb = XLSX.readFile(path.join(__dirname, '..', 'ben_review_sheet.xlsx'));
const META = new Set(['Summary', 'Notification Catalogue', 'Signature Guide']);

const grid = (name) =>
  XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', blankrows: true });

const MARKERS = [
  ['old', /^OLD\s*—\s*Preview/i],
  ['new', /^NEW\s*—\s*Preview/i],
  ['note', /^Bold gold text below/i],
  ['sms', /^NEW\s*—\s*SMS Version/i],
  ['why', /^Why This Changed/i],
  ['sig', /^Signature to Use/i],
  // Trailing dev-reference table on 19 tabs. It has no marker above it, so
  // without this boundary the signature section runs to the end of the sheet
  // and swallows it.
  ['devlinks', /^Buttons?\s*&\s*Links/i],
];

// ---------- reference tabs ----------

const sumRows = grid('Summary');
const sumHdr = sumRows.findIndex((r) => String(r[0]).trim() === 'Template (Tab Name)' && String(r[2]).trim() === 'Category');
const summary = new Map();
for (let i = sumHdr + 1; i < sumRows.length; i++) {
  const name = String(sumRows[i][0] || '').trim();
  if (!name) continue;
  summary.set(name, {
    sigCategory: String(sumRows[i][2] || '').trim(),
    status: String(sumRows[i][3] || '').trim(),
    originalTitle: String(sumRows[i][4] || '').trim(),
  });
}

const catRows = grid('Notification Catalogue');
const catHdr = catRows.findIndex((r) => String(r[1]).trim() === 'Template (Tab Name)');
const channels = new Map();
for (let i = catHdr + 1; i < catRows.length; i++) {
  const name = String(catRows[i][1] || '').trim();
  if (!name) continue;
  channels.set(name, {
    email: !!String(catRows[i][3]).trim(),
    sms: !!String(catRows[i][4]).trim(),
    push: !!String(catRows[i][5]).trim(),
    internal: !!String(catRows[i][6]).trim(),
    recipient: String(catRows[i][7] || '').trim(),
  });
}

// Governance and channel guidance are bullet blocks sitting between headings.
const bulletsUnder = (rows, headingRe) => {
  const start = rows.findIndex((r) => headingRe.test(String(r[1]).trim()));
  if (start < 0) return [];
  const out = [];
  for (let i = start + 1; i < rows.length; i++) {
    const v = String(rows[i][1] || '').trim();
    if (!v) { if (out.length) break; else continue; }
    if (!/^•/.test(v)) break;
    out.push(v.replace(/^•\s*/, '').trim());
  }
  return out;
};
const reference = {
  channelGuidelines: bulletsUnder(catRows, /^Channel Guidelines$/i),
  governance: bulletsUnder(catRows, /^Governance & Compliance Notes$/i),
};

// Recommended new notifications: the block between its heading and the next.
const recStart = catRows.findIndex((r) => /^Recommended New Notifications/i.test(String(r[1]).trim()));
reference.recommended = [];
if (recStart >= 0) {
  for (let i = recStart + 2; i < catRows.length; i++) {
    const mod = String(catRows[i][1] || '').trim();
    const evt = String(catRows[i][2] || '').trim();
    if (!mod && !evt) break;
    if (mod === 'Module') continue;
    reference.recommended.push({
      module: mod, event: evt,
      email: !!String(catRows[i][3]).trim(), sms: !!String(catRows[i][4]).trim(),
      push: !!String(catRows[i][5]).trim(), internal: !!String(catRows[i][6]).trim(),
      recipient: String(catRows[i][7] || '').trim(),
    });
  }
}

const sigRows = grid('Signature Guide');
reference.signatures = {};
['1', '2'].forEach((n) => {
  const i = sigRows.findIndex((r) => new RegExp('^Category ' + n + '\\s*—').test(String(r[1]).trim()));
  if (i < 0) return;
  reference.signatures['category' + n] = {
    heading: String(sigRows[i][1]).trim(),
    scope: String(sigRows[i + 1][1] || '').trim(),
    rule: String(sigRows[i + 2][2] || '').trim(),
    block: String(sigRows[i + 3][2] || '').trim(),
  };
});

// ---------- template tabs ----------

const templates = wb.SheetNames.filter((n) => !META.has(n)).map((name) => {
  const rows = grid(name);
  const colB = rows.map((r) => String(r[1] || ''));

  const at = {};
  MARKERS.forEach(([k, re]) => { at[k] = colB.findIndex((v) => re.test(v.trim())); });
  const found = MARKERS.map(([k]) => at[k]).filter((i) => i >= 0).sort((a, b) => a - b);

  // A single cell can hold several lines of copy, so split on newlines as well
  // as rows -- otherwise a whole body collapses into one "line".
  const section = (key) => {
    const s = at[key];
    if (s < 0) return [];
    const next = found.find((i) => i > s);
    return colB.slice(s + 1, next === undefined ? colB.length : next)
      .flatMap((v) => String(v).split('\n'))
      .map((v) => v.trim())
      .filter(Boolean);
  };

  const label = (re) => {
    const i = colB.findIndex((v) => re.test(v.trim()));
    return i < 0 ? '' : String(rows[i][2] || '').trim();
  };

  // The gold-marking note sits inside the NEW block; copy starts after it.
  const newLines = at.note >= 0 ? section('note') : section('new');
  const subjLine = newLines.find((l) => /^Subject\s*:/i.test(l)) || '';

  // Tabs with no SMS block instead carry a one-line ruling inside the email
  // block ("SMS Version: Not recommended — ..."). That is a decision with a
  // rationale, not body copy, so lift it out.
  const smsNoteLine = newLines.find((l) => /^SMS Version\s*:/i.test(l)) || '';
  const smsNote = smsNoteLine.replace(/^SMS Version\s*:\s*/i, '').trim();

  const body = newLines.filter(
    (l) => !/^Subject\s*:/i.test(l) && !/^SMS Version\s*:/i.test(l)
  );

  // A tab left with no body at all was ruled redundant against another template.
  const redundantTo = (smsNote.match(/redundant to ["“]([^"”]+)["”]/i) || [])[1] || '';

  const sigLines = section('sig');
  const sigNote = sigLines.length && /^Category\s*[12]\b/i.test(sigLines[0]) ? sigLines[0] : '';
  const sigBlock = sigNote ? sigLines.slice(1) : sigLines;

  const s = summary.get(name) || {};
  const c = channels.get(name) || {};

  return {
    tab: name,
    originalTitle: label(/^Original Title$/i) || name,
    renamedFrom: s.originalTitle || '',
    category: label(/^Category$/i),
    trigger: label(/^Trigger$/i),
    sigCategory: s.sigCategory || '',
    reviewStatus: s.status || '',
    channels: {
      email: !!c.email, sms: !!c.sms, push: !!c.push,
      internal: !!c.internal, recipient: c.recipient || '',
    },
    subject: subjLine.replace(/^Subject\s*:\s*/i, '').trim(),
    body,
    sms: section('sms'),
    smsNote,
    redundantTo,
    redundant: !body.length,
    why: section('why').flatMap((v) => v.split('\n').map((x) => x.replace(/^•\s*/, '').trim()).filter(Boolean)),
    signatureNote: sigNote,
    signature: sigBlock,
    devLinks: section('devlinks'),
    hasOldInSheet: section('old').length > 0,
  };
});

// Corrections to known errors in the sheet, kept out of the extractor itself.
const { applyOverrides } = require('./lib/overrides.js');
const patched = applyOverrides(templates);
if (patched.length) {
  console.log('--- overrides applied ---');
  patched.forEach((p) => console.log('  ' + (p.ok ? (p.skipped ? 'skip' : ' ok ') : 'FAIL') + '  ' + p.tab + ': ' + p.what));
  console.log('');
}

fs.writeFileSync(path.join(__dirname, '..', 'new_templates.json'),
  JSON.stringify({ reference, templates }, null, 2));

console.log('templates:', templates.length);
console.log('no subject :', templates.filter((t) => !t.subject).map((t) => t.tab).join(', ') || 'none');
console.log('redundant  :', templates.filter((t) => t.redundant).map((t) => t.tab + (t.redundantTo ? ' -> ' + t.redundantTo : '')).join(', ') || 'none');
console.log('with sms   :', templates.filter((t) => t.sms.length).length);
console.log('sms ruled out with a reason:', templates.filter((t) => !t.sms.length && t.smsNote).length);
console.log('with why   :', templates.filter((t) => t.why.length).length);
console.log('no sigCat  :', templates.filter((t) => !t.sigCategory).map((t) => t.tab).join(', ') || 'none');
console.log('renamed    :', templates.filter((t) => t.renamedFrom).length);
console.log('\nreference: guidelines=' + reference.channelGuidelines.length,
  'governance=' + reference.governance.length,
  'recommended=' + reference.recommended.length,
  'signatures=' + Object.keys(reference.signatures).length);

const ex = templates.find((t) => t.tab === 'Consignment Sold');
console.log('\n--- sample: Consignment Sold ---');
console.log('subject:', ex.subject);
console.log('body   :', ex.body.length, 'lines; sms:', ex.sms.length, '; why:', ex.why.length);
console.log('sigCat :', ex.sigCategory, '| channels:', JSON.stringify(ex.channels));
