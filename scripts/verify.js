// Structural check on the built deliverable: complete, and fully offline since
// the dev team opens it as a local file.
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const file = path.join(__dirname, '..', 'DealerCore-Reviewed-Copy.html');
const html = fs.readFileSync(file, 'utf8');
const $ = cheerio.load(html);

const ids = $('section.tpl:not(.guide)').map((i, e) => $(e).attr('id')).get();
const expected = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'new_templates.json'), 'utf8')).templates;
// Layouts render a plain statement instead of an email, and a retired template
// has no body at all, so neither contributes an email preview.
const withBody = expected.filter((t) => t.body.length && !t.isLayout).length;
const withSms = expected.filter((t) => t.sms.length).length;

const checks = {
  'template sections': $('section.tpl:not(.guide)').length,
  'nav links': $('.navlink').length,
  'unique section ids': new Set(ids).size,
  'old previews (iframes)': $('iframe').length,
  'new email previews': $('.dc-card').length,
  'cat-1 dealership wrappers': $('.dc-logo-dealer').length,
  'sms bubbles': $('.bubble').length,
  'push cards': $('.push').length,
};
Object.entries(checks).forEach(([k, v]) => console.log(String(v).padStart(5) + '  ' + k));

const remote = [];
$('link[href],script[src],img[src],iframe[src]').each((_, el) => {
  const v = $(el).attr('href') || $(el).attr('src');
  if (v && !/^(#|data:|about:)/.test(v)) remote.push(v);
});
const urls = html.match(/https?:\/\/[^\s"'<>)]+/g) || [];
console.log('\nremote assets:', remote.length ? remote.join(', ') : 'none');
console.log('http(s) URLs :', urls.length ? [...new Set(urls)].slice(0, 3).join(', ') : 'none');
console.log('size         :', (Buffer.byteLength(html) / 1024 / 1024).toFixed(2), 'MB');

// The client script is emitted from a template literal, so an unescaped \n in a
// generated string silently produces a page-wide SyntaxError. Parse it here.
const script = (html.match(/<script>([\s\S]*?)<\/script>/) || [])[1] || '';
let scriptOk = true, scriptErr = '';
try { new Function(script); } catch (e) { scriptOk = false; scriptErr = e.message; }
console.log('client script parses:', scriptOk ? 'yes' : 'NO — ' + scriptErr);

const problems = [];
if (!scriptOk) problems.push('client script has a syntax error: ' + scriptErr);
if ($('section.tpl:not(.guide)').length !== expected.length) problems.push('expected ' + expected.length + ' sections');
if (new Set(ids).size !== ids.length) problems.push('duplicate section ids');
if (remote.length) problems.push('remote assets present — not offline-safe');
// One template is marked redundant and so has no replacement email.
if ($('.dc-card').length !== withBody) problems.push('email previews ' + $('.dc-card').length + ' != ' + withBody);
if ($('.bubble').length !== withSms) problems.push('sms bubbles ' + $('.bubble').length + ' != ' + withSms);
console.log('\n' + (problems.length ? 'PROBLEMS: ' + problems.join('; ') : 'All structural checks passed.'));
