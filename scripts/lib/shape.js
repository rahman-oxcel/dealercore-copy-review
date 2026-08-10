// Old and new copy have different scopes: the Blade templates carry heading,
// signature and legal footer inline, whereas Ben's tabs hold body only and keep
// the signature in its own block. Trim the old side so the diff compares like
// with like instead of reporting the whole signature as deleted.

const SIGNOFF = /^(best regards|kind regards|regards|sincerely|thanks|thank you|warm regards|cheers|yours (sincerely|faithfully))[,.!]?$/i;

const FOOTER = [
  /this email is from/i,
  /\bABN\b/i,
  /unsubscribe/i,
  /all rights reserved/i,
  /^©/,
  /do not reply|no-?reply/i,
  /if you (received|are not) /i,
  /terms (and|&) conditions/i,
  /privacy policy/i,
  /help cent(re|er)/i,
  /^(facebook|twitter|linkedin|instagram|youtube)$/i,
];

const isFooter = (line) => FOOTER.some((re) => re.test(line));

// Returns the body copy plus whatever was trimmed, so the deliverable can still
// show the dev team the signature and legal text that exist today.
function splitOldCopy(blocks, subject) {
  const lines = blocks.map((b) => b.text.trim()).filter(Boolean);

  // Drop the heading if it is the subject we already diff separately.
  let start = 0;
  if (subject && lines.length && lines[0].trim() === subject.trim()) start = 1;

  let cut = -1;
  for (let i = start; i < lines.length; i++) {
    if (SIGNOFF.test(lines[i])) { cut = i; break; }
  }
  // No sign-off: fall back to the first footer-looking line.
  if (cut < 0) {
    for (let i = start; i < lines.length; i++) {
      if (isFooter(lines[i])) { cut = i; break; }
    }
  }

  const body = (cut < 0 ? lines.slice(start) : lines.slice(start, cut)).filter((l) => !isFooter(l));
  const tail = cut < 0 ? [] : lines.slice(cut);

  return {
    body,
    signature: tail.filter((l) => !isFooter(l)),
    legal: lines.filter(isFooter),
  };
}

// Ben typed list items with a leading bullet; the Blade templates use <li>.
// Strip the character so the diff compares the words, not the markup style.
const stripBullet = (line) => String(line).replace(/^[•·▪‣●*-]\s+/, '').trim();

module.exports = { splitOldCopy, isFooter, SIGNOFF, stripBullet };
