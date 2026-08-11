// Corrections to the review sheet, applied in the pipeline rather than by
// editing Ben's workbook, so the source stays untouched and every change is
// auditable in data/overrides.json.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', '..', 'data', 'overrides.json');
const rules = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};

// Anchor on the label text, not a row number, so the fix survives the copy
// shifting up or down in the sheet.
function indexOfLabel(lines, label, occurrence) {
  let seen = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === label) {
      seen++;
      if (seen === occurrence) return i;
    }
  }
  return -1;
}

// Copy the signature from a template already in the target category rather than
// retyping it, so a flipped template can never drift from the real block.
function signatureFor(templates, category) {
  const n = String(category).match(/[12]/);
  const donor = templates.find(
    (t) => !rules[t.tab] && n && new RegExp(n[0]).test(t.sigCategory) && (t.signature || []).length
  );
  return donor ? donor.signature.slice() : null;
}

function applyOverrides(templates) {
  const applied = [];

  templates.forEach((t) => {
    const rule = rules[t.tab];
    if (!rule) return;

    if (rule.signatureCategory && rule.signatureCategory !== t.sigCategory) {
      const block = signatureFor(templates, rule.signatureCategory);
      if (!block) {
        applied.push({ tab: t.tab, ok: false, what: 'no donor signature for ' + rule.signatureCategory });
      } else {
        applied.push({ tab: t.tab, ok: true,
          what: 'signature ' + t.sigCategory + ' -> ' + rule.signatureCategory });
        t.sigCategory = rule.signatureCategory;
        t.signature = block;
      }
    }

    (rule.setAfterLabel || []).forEach((r) => {
      const i = indexOfLabel(t.body, r.label, r.occurrence || 1);
      if (i < 0 || i + 1 >= t.body.length) {
        applied.push({ tab: t.tab, ok: false, what: 'label not found: ' + r.label });
        return;
      }
      const before = t.body[i + 1];
      if (before === r.value) {
        applied.push({ tab: t.tab, ok: true, skipped: true, what: r.label + ' already correct' });
        return;
      }
      t.body[i + 1] = r.value;
      applied.push({ tab: t.tab, ok: true, what: r.label + ' ' + before + ' -> ' + r.value });
    });

    (rule.renameLabel || []).forEach((r) => {
      const i = indexOfLabel(t.body, r.label, r.occurrence || 1);
      if (i < 0) {
        applied.push({ tab: t.tab, ok: false, what: 'label not found: ' + r.label + ' #' + r.occurrence });
        return;
      }
      const before = t.body[i];
      t.body[i] = r.value;
      applied.push({ tab: t.tab, ok: true, what: 'label ' + before + ' -> ' + r.value });
    });

    (rule.notes || []).forEach((n) => { if (!t.why.includes(n)) t.why.push(n); });
  });

  return applied;
}

module.exports = { applyOverrides, rules };
