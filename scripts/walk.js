// Dumps templates in sidebar order. Usage: node scripts/walk.js 68 97 [--full]
const fs = require('fs');
const news = JSON.parse(fs.readFileSync(__dirname + '/../new_templates.json', 'utf8')).templates;
const joins = JSON.parse(fs.readFileSync(__dirname + '/../join_map.json', 'utf8'));
const olds = JSON.parse(fs.readFileSync(__dirname + '/../old_templates.json', 'utf8'));
const joinByTab = new Map((joins.rows || joins).map((j) => [j.tab, j]));
const oldById = new Map(olds.map((o) => [o.id, o]));

const GROUPS = ['Customer', 'Dealer', 'Staff', 'System'];
const IN_GROUP = { Consignor: 'Customer', Seller: 'Customer' };
const groupOf = (n) => {
  const r = IN_GROUP[n.channels.recipient] || n.channels.recipient;
  return GROUPS.includes(r) ? r : 'System';
};
const model = news.map((n) => ({ n, j: joinByTab.get(n.tab) || { status: 'NEW' } }));
model.sort((a, b) => GROUPS.indexOf(groupOf(a.n)) - GROUPS.indexOf(groupOf(b.n)));

const from = +(process.argv[2] || 1), to = +(process.argv[3] || model.length);
const full = process.argv.includes('--full');

model.forEach((m, i) => {
  const num = i + 1;
  if (num < from || num > to) return;
  const n = m.n;
  const o = m.j.oldId ? oldById.get(m.j.oldId) : null;
  console.log('\n================ ' + num + '. ' + (n.name || n.tab) + '  [tab: ' + n.tab + ']');
  console.log('  group=' + groupOf(n) + ' recipient=' + n.channels.recipient +
    ' sig=' + n.signatureCategory + ' layout=' + !!n.isLayout + ' redundant=' + !!n.redundant +
    ' channels=' + JSON.stringify(n.channels));
  console.log('  SUBJECT: ' + n.subject);
  if (n.cta) console.log('  CTA: ' + JSON.stringify(n.cta) + '  after=' + JSON.stringify(n.ctaAfter || ''));
  if (n.flagNote) console.log('  FLAG: ' + n.flagNote);
  if (n.noteBar) console.log('  NOTE: ' + n.noteBar);
  console.log('  --- BODY');
  (n.body || []).forEach((l, k) => console.log('   b' + k + ': ' + JSON.stringify(l)));
  console.log('  --- SMS: ' + JSON.stringify(n.sms || []));
  if (n.inApp) console.log('  --- INAPP: ' + JSON.stringify(n.inApp));
  console.log('  --- SIGNATURE: ' + JSON.stringify(n.signature || []));
  if (n.why) console.log('  --- WHY: ' + JSON.stringify(n.why).slice(0, 600));
  if (o) {
    console.log('  --- OLD id=' + o.id + ' file=' + (o.filePath || '') + ' trigger=' + (o.trigger || ''));
    console.log('  --- OLD SUBJECT: ' + (o.subject || '(unknown)'));
    console.log('  --- OLD VARS: ' + JSON.stringify(o.variables || []));
    if (full) console.log('  --- OLD COPY:\n' + String(o.copyText || '').split('\n').map((l) => '     | ' + l).join('\n'));
  } else {
    console.log('  --- OLD: none (NEW)');
  }
});
