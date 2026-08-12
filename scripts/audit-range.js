// Set-wide pattern audit, so a fix found in one template propagates.
const fs = require('fs');
const { templates } = JSON.parse(fs.readFileSync(__dirname + '/../new_templates.json', 'utf8'));
const subjects = JSON.parse(fs.readFileSync(__dirname + '/../data/subjects.json', 'utf8'));

const all = (t) => [t.subject, ...(t.body || []), ...(t.sms || [])].join('\n');

const PATTERNS = [
  ['support-team-caps', /DealerCore Support Team/],
  ['password', /password/i],
  ['copy-paste-link', /copy and paste/i],
  ['generic-Number', /\[Number\]/],
  ['generic-Text', /\[Text\]/],
  ['generic-Title', /\[Title\]/],
  ['generic-Date-alone', /\[Date\](?!\s*and)/],
  ['manager-placeholder', /\[Manager /],
  ['click-the-button', /click the button|the button above|button below/i],
  ['em-dash', /—/],
  ['pleased-to-inform', /pleased to inform/i],
  ['a-new-feedback', /A new feedback/i],
  ['odometers-label', /Odometers:/],
  ['slash-placeholder', /\[[^\]]*\/[^\]]*\]/],
  ['eg-placeholder', /\[[^\]]*e\.g\./i],
  ['purpose', /\[Purpose\]/],
  ['double-placeholder-adjacent', /\]\[/],
];

PATTERNS.forEach(([name, re]) => {
  const hits = templates.filter((t) => re.test(all(t))).map((t) => t.tab);
  console.log('\n' + name + '  (' + hits.length + ')');
  hits.forEach((h) => console.log('   ' + h));
});

console.log('\n--- em dash in our own subjects.json');
Object.entries(subjects).forEach(([k, v]) => { if (/—/.test(v)) console.log('   ' + k + ' :: ' + v); });

console.log('\n--- placeholder frequency across set');
const freq = {};
templates.forEach((t) => (all(t).match(/\[[^\]]+\]/g) || []).forEach((p) => (freq[p] = (freq[p] || 0) + 1)));
Object.entries(freq).sort((a, b) => a[1] - b[1]).forEach(([p, n]) => { if (n <= 2) console.log('   ' + n + '  ' + p); });

console.log('\n--- appointment tabs');
templates.filter((t) => /appointment|calendar/i.test(t.tab)).forEach((t) => console.log('   ' + t.tab + '  | name=' + (t.displayName || '') + ' | recipient=' + t.channels.recipient + ' | subject=' + t.subject));
