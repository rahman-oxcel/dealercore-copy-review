// QA sweep over the 90 live Blade templates: identity data and legal entities
// that are hardcoded today and will keep going out until the dev team fixes them.
const fs = require('fs');
const path = require('path');

const t = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'old_templates.json'), 'utf8'));

const DEALERCORE_ABN = '26 696 593 969';
const findings = [];
const add = (id, kind, detail, evidence) => findings.push({ id, kind, detail, evidence });

const SIGNOFF = /^(best regards|kind regards|regards|sincerely|thanks|thank you|warm regards|cheers)[,.]?$/i;
const PLACEHOLDER = /^[\[{]/;                 // [Name] or {{ $var }} are correct
const PERSON = /^[A-Z][a-z]+(?:\s+[A-Z][a-z'-]+){1,2}$/; // "Khubaib Yaseen"
const PHONE = /(?:\+?61[\s-]?\d(?:[\s-]?\d){7,9})|(?:\b0[45]\d{2}[\s-]?\d{3}[\s-]?\d{3}\b)/;
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

t.forEach((tpl) => {
  const lines = (tpl.blocks || []).map((b) => b.text.trim());

  // A proper name immediately after a sign-off is a hardcoded signature.
  lines.forEach((line, i) => {
    if (!SIGNOFF.test(line)) return;
    const next = (lines[i + 1] || '').trim();
    if (next && !PLACEHOLDER.test(next) && PERSON.test(next)) {
      add(tpl.id, 'hardcoded-signature', 'Sign-off followed by a real person name', next);
    }
  });

  // Greetings addressed to a specific person. "Hi Team" / "Hi All" are correct
  // for internal notifications, so only a real first name counts as a defect.
  const GENERIC = /^(team|all|there|everyone|admin|support|customer|sir|madam)$/i;
  lines.forEach((line) => {
    const m = line.match(/^(hi|hello|dear)\s+([A-Z][a-z]+)\s*[,!]?$/i);
    if (m && !PLACEHOLDER.test(m[2]) && !GENERIC.test(m[2])) {
      add(tpl.id, 'hardcoded-greeting', 'Greeting names a specific person', line);
    }
  });

  lines.forEach((line) => {
    const p = line.match(PHONE);
    if (p) add(tpl.id, 'hardcoded-phone', 'Literal phone number in copy', p[0]);
    const e = line.match(EMAIL);
    if (e && !/example\.|dealercore\.com\.au/i.test(e[0])) {
      add(tpl.id, 'hardcoded-email', 'Literal email address in copy', e[0]);
    }
  });

  // Legal entity: anything that is not DealerCore's own ABN is wrong.
  const abns = tpl.blade.match(/ABN[:\s]*([0-9][0-9\s]{9,})/gi) || [];
  abns.forEach((a) => {
    const digits = a.replace(/[^0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    if (digits && digits !== DEALERCORE_ABN) {
      add(tpl.id, 'wrong-legal-entity', 'Carries an ABN that is not DealerCore', a.replace(/\s+/g, ' ').trim());
    }
  });
  const co = tpl.blade.match(/[A-Z][A-Za-z&.\s]{3,40}PTY\s+LTD/g) || [];
  [...new Set(co)].forEach((c) => {
    if (!/dealercore/i.test(c)) {
      add(tpl.id, 'wrong-legal-entity', 'Names a company that is not DealerCore', c.replace(/\s+/g, ' ').trim());
    }
  });

});

// 67 of 90 paths mix separators ("emails/appointment\cancellation.blade.php"),
// which is the documentation generator joining paths on Windows rather than a
// defect in the app. Report it once, as a note about the source doc.
const mixedPaths = t.filter((x) => x.filePath.includes('\\')).map((x) => x.id);
if (mixedPaths.length) {
  add('(source document)', 'doc-artifact',
    mixedPaths.length + ' of ' + t.length + ' file paths mix / and \\ separators — '
    + 'the documentation generator joined paths on Windows. Not an app defect; '
    + 'worth fixing in whatever produced the HTML.',
    'e.g. ' + t.find((x) => x.filePath.includes('\\')).filePath);
}

const byKind = {};
findings.forEach((f) => (byKind[f.kind] = (byKind[f.kind] || 0) + 1));

console.log('=== QA findings on the 90 live templates ===');
console.log(JSON.stringify(byKind, null, 2));
console.log('\naffected templates:', new Set(findings.map((f) => f.id)).size);

Object.keys(byKind).sort().forEach((kind) => {
  console.log('\n--- ' + kind + ' ---');
  findings.filter((f) => f.kind === kind).forEach((f) => {
    console.log('  ' + f.id.padEnd(40) + ' ' + f.evidence.slice(0, 70));
  });
});

fs.writeFileSync(path.join(__dirname, '..', 'qa_old.json'), JSON.stringify(findings, null, 2));
console.log('\nwrote qa_old.json (' + findings.length + ' findings)');
