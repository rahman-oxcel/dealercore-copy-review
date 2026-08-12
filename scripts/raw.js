// Dump pre-override sheet text for the tabs named on argv.
const TABS = process.argv.slice(2);
const orig = require('./lib/overrides.js');
const real = orig.applyOverrides;
orig.applyOverrides = function (templates) {
  TABS.forEach((tab) => {
    const t = templates.find((x) => x.tab === tab);
    if (!t) return console.log('RAW MISSING ' + tab);
    console.log('RAW ### ' + tab + '  subject=' + JSON.stringify(t.subject));
    (t.body || []).forEach((l, i) => console.log('RAW b' + i + ': ' + JSON.stringify(l)));
    (t.sms || []).forEach((l, i) => console.log('RAW s' + i + ': ' + JSON.stringify(l)));
  });
  return real.apply(this, arguments);
};
require('./extract-new.js');
