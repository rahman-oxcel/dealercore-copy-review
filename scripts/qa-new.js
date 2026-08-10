// Do the reviewed replacements actually clear the defects found in the live
// templates? Anything still present here is a defect being carried forward.
const fs = require('fs');
const path = require('path');

const { templates } = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'new_templates.json'), 'utf8')
);

const PROBLEMS = [
  ['wrong legal entity', /H\s*&\s*R\s*RESEARCH|663\s*170\s*116/i],
  ['hardcoded first name', /\b(hi|hello|dear)\s+(joseph|khubaib|rony|ratib)\b/i],
  ['hardcoded person name', /\b(khubaib\s+yaseen|joseph)\b/i],
  ['hardcoded phone', /(?:\+?61[\s-]?\d(?:[\s-]?\d){7,9})|(?:\b0[45]\d{2}[\s-]?\d{3}[\s-]?\d{3}\b)/],
  ['non-DealerCore ABN', /ABN[:\s]*(?!26\s*696\s*593\s*969)\d[\d\s]{9,}/i],
];

let found = 0;
templates.forEach((t) => {
  const text = [t.subject, ...t.body, ...t.sms, ...t.signature].join('\n');
  PROBLEMS.forEach(([label, re]) => {
    const m = text.match(re);
    if (m) {
      found++;
      console.log('  ' + t.tab.padEnd(32) + label.padEnd(24) + '“' + m[0].trim() + '”');
    }
  });
});

console.log(found ? '\n' + found + ' issue(s) carried into the new copy.'
                  : 'New copy is clean — none of the live defects carry forward.');

// The legal footer is supplied by the wrapper, not the body copy, so confirm no
// tab is still hand-writing its own. "ABN: [ABN]" is a data field in the body,
// not a footer, so match a literal registration number or the footer sentence.
const ownFooter = templates.filter((t) =>
  [...t.body, ...t.signature].some((l) =>
    /this email is from|ABN[:\s]*\d[\d\s]{9,}/i.test(l)));
console.log('\ntabs still writing their own legal footer:',
  ownFooter.length ? ownFooter.map((t) => t.tab).join(', ') : 'none');
