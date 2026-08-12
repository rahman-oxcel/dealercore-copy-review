// Read out the facts CLAUDE.md asserts, so the doc can be checked against the
// code rather than against memory.
const fs = require('fs');
const path = require('path');

const R = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'));
const { templates } = R('new_templates.json');
const src = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');

const tally = (fn) => templates.reduce((a, t) => ((a[fn(t)] = (a[fn(t)] || 0) + 1), a), {});

console.log('signature categories :', JSON.stringify(tally((t) => t.sigCategory)));
console.log('recipients           :', JSON.stringify(tally((t) => t.channels.recipient)));
console.log('with sms             :', templates.filter((t) => t.sms.length).length);
console.log('layouts              :', templates.filter((t) => t.isLayout).length);
console.log('redundant            :', templates.filter((t) => t.redundant).length);
console.log('subject overrides    :', Object.keys(R('data/subjects.json')).filter((k) => k[0] !== '_').length);
console.log('override entries     :', Object.keys(R('data/overrides.json')).filter((k) => k[0] !== '_').length);

const social = require('./lib/social.js');
const wrapper = require('./lib/wrapper.js');
console.log('social glyphs        :', social.ORDER.length, '(' + social.ORDER.join(', ') + ')');
console.log('SIGN_OFF             :', JSON.stringify(wrapper.SIGN_OFF));

const build = src('build.js');
const styles = src('lib/styles.js');
const overrides = src('lib/overrides.js');

const has = (label, re, text) => console.log(label.padEnd(21) + ':', re.test(text));
has('fit() sizes panels', /function fit\(/, build);
has('attachment chip', /hasAttachment/, build);
has('subject bar removed', /subjbar/, build + styles);
has('panel fixed at 520', /\.panel\{height:520px/, styles);
has('amber note removed', /dc-note/, build + styles + src('lib/wrapper.js'));
console.log('iframe sandbox       :', (build.match(/sandbox=("[^"]*"|\w+)/) || ['none'])[0]);

console.log('override capabilities:', ['layout', 'clearBody', 'recipient', 'signatureCategory',
  'replace', 'replaceLines', 'prependLines', 'removeLines', 'setAfterLabel', 'renameLabel']
  .filter((k) => new RegExp('rule\\.' + k).test(overrides)).join(', '));
console.log('rule passes          :', ['applyOverrides', 'applySubjects', 'normaliseGreetings', 'removeCallToActions']
  .filter((k) => overrides.includes('function ' + k)).join(', '));
