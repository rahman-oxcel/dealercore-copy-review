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

// Greetings were inconsistent in three ways: missing commas, no name at all,
// and names that don't match who actually receives the email (a customer name
// on dealer mail, or an organisation greeted as if it were a person). Applied
// as a rule so it stays true as copy changes.
const GREETS = {
  Customer: { name: '[Customer First Name]', ok: /customer|vehicle owner/i },
  Dealer:   { name: '[Dealer First Name]',   ok: /dealer(?!ship)/i },
  Staff:    { name: '[Staff First Name]',    ok: /staff|manager|broker/i },
  System:   { name: '[User First Name]',     ok: /user/i },
};

function normaliseGreetings(templates) {
  const done = [];
  templates.forEach((t) => {
    if (t.isLayout || !t.body.length) return;
    const g = (t.body[0] || '').trim();
    if (!/^(hi|hello|dear)\b/i.test(g)) return;
    // "Hi Team," is correct for internal alerts and stays as it is.
    if (/\bteam\b/i.test(g)) {
      if (!/[,!.]$/.test(g)) { t.body[0] = g + ','; done.push(t.tab + ' (comma)'); }
      return;
    }

    const rule = GREETS[t.channels.recipient] || GREETS.System;
    const named = (g.match(/\[([^\]]+)\]/) || [])[1] || '';
    const wrong = !named || /dealership name|branch name|company/i.test(named) || !rule.ok.test(named);

    if (wrong) {
      const word = (g.match(/^(hi|hello|dear)/i) || ['Hi'])[0];
      const rest = g.replace(/^(hi|hello|dear)\s*,?\s*(\[[^\]]*\])?\s*,?\s*/i, '').trim();
      t.body[0] = word + ' ' + rule.name + ',';
      // Channel Update runs its greeting and first sentence together; keep the
      // sentence rather than discarding it with the broken greeting.
      if (rest) {
        t.body.splice(1, 0, rest.charAt(0).toUpperCase() + rest.slice(1));
      }
      done.push(t.tab + ' (' + (named || 'no name') + ' -> ' + rule.name + ')');
      return;
    }

    if (!/[,!.]$/.test(g)) { t.body[0] = g + ','; done.push(t.tab + ' (comma)'); }
  });
  return done;
}

// No copy should invite a phone call. Data fields that report someone else's
// number ("Mobile: [Mobile Number]" in a lead alert) are left alone; only
// call-to-action phrasing is rewritten, and each sentence keeps its sense.
const NO_CALLS = [
  [/\bCall\s+\[Salesperson Name\]\s+on\s+\[Salesperson Contact Number\]/gi, 'Get in touch with [Salesperson Name]'],
  [/\bcontact\s+\[Salesperson Name\]\s+on\s+\[Salesperson Contact Number\]/gi, 'contact [Salesperson Name]'],
  [/\bplease call\s+\[Mobile Number\]\s+to rebook/gi, 'please get in touch to rebook'],
  [/\bCall\s+\[(?:Dealer's Contact Number|Mobile Number)\]/gi, 'Get in touch'],
  [/\[Support Mobile Number\]\s*\/\s*/gi, ''],
  [/\s*\/\s*\[Support Mobile Number\]/gi, ''],
  [/\s+or\s+\[(?:Dealer's Contact Number|Salesperson Contact Number)\]/gi, ''],
  [/\s+on\s+\[(?:Salesperson Contact Number|Dealer's Contact Number)\]/gi, ''],
  [/\bjust give us a call\b/gi, 'just get in touch'],
  [/\bgive us a call\b/gi, 'get in touch'],
];

function removeCallToActions(templates) {
  const done = [];
  templates.forEach((t) => {
    let changed = false;
    const swap = (s) => {
      let out = s;
      NO_CALLS.forEach(([re, to]) => { const next = out.replace(re, to); if (next !== out) { out = next; changed = true; } });
      return out;
    };
    t.body = t.body.map(swap);
    t.sms = t.sms.map(swap);
    if (changed) done.push(t.tab);
  });
  return done;
}

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

    // Straight text substitution across body, subject and SMS. Every match must
    // be found, or the correction has silently stopped applying.
    (rule.replace || []).forEach((r) => {
      let hits = 0;
      const swap = (s) => {
        if (!s.includes(r.from)) return s;
        hits++;
        return s.split(r.from).join(r.to);
      };
      t.body = t.body.map(swap);
      t.sms = t.sms.map(swap);
      t.subject = swap(t.subject);
      applied.push({ tab: t.tab, ok: hits > 0,
        what: hits ? '"' + r.from + '" -> "' + r.to + '"' : 'text not found: "' + r.from + '"' });
    });

    // Swap one line for one or more replacements, in place.
    (rule.replaceLines || []).forEach((r) => {
      const at = t.body.findIndex((l) => l.trim() === r.find.trim());
      if (at < 0) {
        applied.push({ tab: t.tab, ok: false, what: 'line to replace not found: "' + r.find.slice(0, 40) + '"' });
        return;
      }
      t.body.splice(at, 1, ...r.lines);
      applied.push({ tab: t.tab, ok: true,
        what: 'replaced "' + r.find.slice(0, 34) + '" with ' + r.lines.length + ' line(s)' });
    });

    (rule.prependLines || []).slice().reverse().forEach((text) => {
      if (t.body[0] && t.body[0].trim() === text.trim()) return;
      t.body.unshift(text);
      applied.push({ tab: t.tab, ok: true, what: 'prepended: "' + text + '"' });
    });

    (rule.removeLines || []).forEach((text) => {
      const before = t.body.length;
      t.body = t.body.filter((l) => l.trim() !== text.trim());
      applied.push({ tab: t.tab, ok: t.body.length < before,
        what: t.body.length < before ? 'removed line: "' + text.slice(0, 46) + '..."'
                                     : 'line to remove not found: "' + text.slice(0, 46) + '..."' });
    });

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

module.exports = { applyOverrides, applySubjects, normaliseGreetings, removeCallToActions, rules };
