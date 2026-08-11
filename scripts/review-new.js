// Editorial pass over the reviewed copy: surface mechanical defects across all
// 100 templates so the judgement calls can be made against a real list.
const fs = require('fs');
const path = require('path');

const { templates } = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'new_templates.json'), 'utf8')
);

const findings = [];
const add = (tab, kind, detail, evidence) => findings.push({ tab, kind, detail, evidence });

const PH = /\[[^\]\n]{1,60}\]/g;
// Substitute a word, not a space: blanking placeholders invents double spaces
// and swallows the words either side of them.
const stripPH = (s) => s.replace(PH, 'X');

// Label/value rows ("Sale Date: [Sale Date]") are table content, not prose, so
// they must not be measured as sentences.
const isRow = (l) => /^[•\-*]?\s*[A-Z][A-Za-z /()'’-]{1,38}:\s*/.test(l.trim()) || /^[•\-*]/.test(l.trim());

// --- 1. American spellings (the review standardised on Australian English) ---
const US = [
  [/\borganiz(e|ed|ing|ation)\b/i, 'organise'], [/\brecogniz(e|ed|ing)\b/i, 'recognise'],
  [/\bapologiz(e|ed|ing)\b/i, 'apologise'], [/\bcolor\b/i, 'colour'], [/\bhonor\b/i, 'honour'],
  [/\bcenter\b/i, 'centre'], [/\bcatalog\b/i, 'catalogue'], [/\btraveled\b/i, 'travelled'],
  [/\bcanceled\b/i, 'cancelled'], [/\bfulfill\b/i, 'fulfil'], [/\benrollment\b/i, 'enrolment'],
  [/\bfinaliz(e|ed|ing)\b/i, 'finalise'], [/\bpersonaliz(e|ed|ing)\b/i, 'personalise'],
  [/\bcustomiz(e|ed|ing)\b/i, 'customise'], [/\bauthoriz(e|ed|ing)\b/i, 'authorise'],
  [/\bprioritiz(e|ed|ing)\b/i, 'prioritise'], [/\blicense\b/i, 'licence (noun)'],
];

// --- 2. Typos seen in the source, plus common ones ---
const TYPOS = [
  /\bcustmer\b/i, /\bfreindly\b/i, /\bbellow\b/i, /\brecieve\b/i, /\bseperate\b/i,
  /\boccured\b/i, /\bdefinately\b/i, /\bteh\b/i, /\bthier\b/i, /\backnowledgeme?nt\b/i,
  /\benquirey\b/i, /\bdealershp\b/i, /\bvehical\b/i, /\bappointmnet\b/i, /\bsucessful/i,
  /\bcommited\b/i, /\bopportunty\b/i, /\bpurchse\b/i,
];

templates.forEach((t) => {
  const lines = [t.subject, ...t.body, ...t.sms].filter(Boolean);
  const all = lines.join('\n');

  US.forEach(([re, want]) => {
    const m = stripPH(all).match(re);
    if (m) add(t.tab, 'us-spelling', 'Use ' + want, m[0]);
  });

  TYPOS.forEach((re) => {
    const m = all.match(re);
    if (m) add(t.tab, 'typo', 'Likely misspelling', m[0]);
  });

  lines.forEach((l) => {
    if (/ {2,}/.test(stripPH(l))) add(t.tab, 'spacing', 'Double space', l.slice(0, 70));
    if (/\s+[,.;:!?]/.test(l)) add(t.tab, 'spacing', 'Space before punctuation', l.slice(0, 70));
    if (/\bi\b/.test(l)) add(t.tab, 'grammar', 'Lowercase "i"', l.slice(0, 70));
  });

  // --- 3. Greeting names the wrong audience ---
  const greet = lines.find((l) => /^(hi|hello|dear)\b/i.test(l));
  if (greet) {
    const who = (greet.match(/\[([^\]]+)\]/) || [])[1] || '';
    const r = (t.channels.recipient || '').toLowerCase();
    if (r === 'dealer' && /customer/i.test(who)) add(t.tab, 'wrong-audience', 'Greets a customer but goes to the dealer', greet);
    if (r === 'customer' && /dealer(?!ship)/i.test(who)) add(t.tab, 'wrong-audience', 'Greets the dealer but goes to a customer', greet);
    if (r === 'staff' && /customer/i.test(who)) add(t.tab, 'wrong-audience', 'Greets a customer but goes to staff', greet);
  }

  // --- 4. Placeholders that say nothing ---
  (all.match(PH) || []).forEach((p) => {
    if (/^\[(content|text|message|line|greeting|action text|body|details)\]$/i.test(p)) {
      add(t.tab, 'vague-placeholder', 'Placeholder carries no meaning', p);
    }
  });

  // --- 5. Sentence length, prose lines only ---
  lines.filter((l) => !isRow(l)).forEach((l) => {
    stripPH(l).split(/(?<=[.!?])\s+/).forEach((sent) => {
      const w = sent.trim().split(/\s+/).filter(Boolean).length;
      if (w > 34) add(t.tab, 'long-sentence', w + ' words', sent.trim().slice(0, 95));
    });
  });

  // --- 6. Subject line hygiene ---
  if (t.subject) {
    if (/[.]$/.test(t.subject)) add(t.tab, 'subject', 'Ends with a full stop', t.subject);
    if (t.subject.length > 62) add(t.tab, 'subject', t.subject.length + ' chars (clipped in most inboxes)', t.subject);
    if (t.subject === t.subject.toUpperCase() && /[A-Z]{4}/.test(t.subject)) add(t.tab, 'subject', 'All caps', t.subject);
  }

  // --- 7. Mixed apostrophes within one template ---
  if (/'/.test(all) && /’/.test(all)) add(t.tab, 'punctuation', 'Mixes straight and curly apostrophes', '');
});

// --- 8. Placeholder vocabulary across the whole set ---
const phCount = {};
templates.forEach((t) => {
  ([t.subject, ...t.body, ...t.sms].join('\n').match(PH) || []).forEach((p) => {
    phCount[p] = (phCount[p] || 0) + 1;
  });
});

const norm = (p) => p.toLowerCase().replace(/[^a-z]/g, '');
const groups = {};
Object.keys(phCount).forEach((p) => {
  const k = norm(p).replace(/^(the|a)/, '');
  (groups[k] = groups[k] || []).push(p);
});

const byKind = {};
findings.forEach((f) => (byKind[f.kind] = (byKind[f.kind] || 0) + 1));

console.log('=== templates reviewed:', templates.length, '===');
console.log(JSON.stringify(byKind, null, 2));
console.log('\naffected templates:', new Set(findings.map((f) => f.tab)).size);

Object.keys(byKind).sort().forEach((kind) => {
  console.log('\n--- ' + kind + ' (' + byKind[kind] + ') ---');
  findings.filter((f) => f.kind === kind).slice(0, 40).forEach((f) => {
    console.log('  ' + f.tab.padEnd(30) + ' ' + f.detail.padEnd(34) + ' ' + String(f.evidence).replace(/\s+/g, ' ').slice(0, 60));
  });
});

console.log('\n=== distinct placeholders:', Object.keys(phCount).length, '===');
console.log('--- used once only (candidates for consolidation) ---');
Object.entries(phCount).filter(([, n]) => n === 1).map(([p]) => p).sort()
  .forEach((p) => console.log('  ' + p));

fs.writeFileSync(path.join(__dirname, '..', 'review_new.json'), JSON.stringify({ findings, phCount }, null, 2));
console.log('\nwrote review_new.json (' + findings.length + ' findings)');
