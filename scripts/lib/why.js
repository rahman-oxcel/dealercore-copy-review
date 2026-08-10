// Ben's change notes, shown verbatim against each template.
// The only thing filtered out is the vague tone commentary, which tells the dev
// team nothing actionable ("Reworded this to sound warmer and more personal").

// Combined notes ("Changed to Australian English spelling; Reworded this…")
// hold two reasons in one cell, so split before filtering.
const parts = (bullet) =>
  String(bullet)
    .split(/\s*;\s*/)
    .map((s) => s.trim().replace(/^[•·▪‣●*-]\s*/, ''))
    .filter(Boolean);

// Vague only. Anything naming a concrete edit stays, including
// "Changed 'Dear' to 'Hi'", which is a specific instruction.
const VAGUE = [
  /^reworded[^;]*\b(warmer|more personal|friendl|freindly|exciting)\b/i,
  /^tidied up the wording\.?$/i,
  /^made (this|it) sound (warmer|friendlier|more personal)\.?$/i,
];

const isVague = (part) => VAGUE.some((re) => re.test(part));

function templateNotes(why) {
  const out = [];
  (why || []).forEach((b) => parts(b).forEach((p) => { if (!isVague(p)) out.push(p); }));
  return [...new Set(out)];
}

module.exports = { templateNotes };
