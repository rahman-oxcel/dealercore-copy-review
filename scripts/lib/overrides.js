// Corrections to the review sheet, applied in the pipeline rather than by
// editing Ben's workbook, so the source stays untouched and every change is
// auditable in data/overrides.json.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', '..', 'data', 'overrides.json');
const rules = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};

// Rewritten subject lines live in their own file: there are 60-odd of them and
// they are a copy decision, separate from the structural corrections above.
const subjFile = path.join(__dirname, '..', '..', 'data', 'subjects.json');
const subjects = fs.existsSync(subjFile) ? JSON.parse(fs.readFileSync(subjFile, 'utf8')) : {};

function applySubjects(templates) {
  const done = [];
  templates.forEach((t) => {
    const next = subjects[t.tab];
    if (!next || t.isLayout || next === t.subject) return;
    done.push({ tab: t.tab, from: t.subject, to: next });
    t.why.push('Subject line updated (was "' + t.subject + '").');
    t.subject = next;
  });
  return done;
}

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

    // Infrastructure, not a notification: no copy, no subject, nothing to review.
    if (rule.layout) {
      t.isLayout = true;
      t.subject = '';
      // Ben's copy notes ("no spelling issues found") are meaningless against a
      // layout, so drop them and let the override note stand alone.
      t.why = [];
      applied.push({ tab: t.tab, ok: true, what: 'marked as layout, not a notification' });
    }

    // Retiring a template: clearing the body is what drives the REDUNDANT state,
    // and `redundant` was computed before overrides ran, so set it here too.
    if (rule.clearBody && t.body.length) {
      applied.push({ tab: t.tab, ok: true, what: 'body cleared, marked redundant' });
      t.body = [];
      t.redundant = true;
    }

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

module.exports = { applyOverrides, applySubjects, rules };
