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
  // A consignor is the person whose vehicle is being sold, not a buyer, so
  // these templates greet them as such.
  Consignor: { name: '[Consignor First Name]', ok: /consignor/i },
  // Someone selling their vehicle to the dealership, through a valuation.
  Seller: { name: '[Seller First Name]', ok: /seller/i },
  // Must be the first-name field, not any field with "customer" in it:
  // [Customer Name] used to pass and left Invoice Quote out of step with the set.
  Customer: { name: '[Customer First Name]', ok: /customer first name|vehicle owner/i },
  Dealer:   { name: '[Dealer First Name]',   ok: /dealer(?!ship)/i },
  Staff:    { name: '[Staff First Name]',    ok: /staff|manager|broker/i },
  System:   { name: '[User First Name]',     ok: /user/i },
};

// A name is wrong if it is absent, names an organisation rather than a person,
// or belongs to someone other than the recipient.
const wrongName = (rule, named) =>
  !named || /dealership name|branch name|company/i.test(named) || !rule.ok.test(named);

// The email greeting sits on its own line, so a greeting that has to be rebuilt
// pushes whatever ran into it down to a line of its own.
function fixEmailGreeting(t, rule, done) {
  if (!t.body.length) return;
  const g = (t.body[0] || '').trim();
  if (!/^(hi|hello|dear)\b/i.test(g)) return;
  // "Hi Team," is correct for internal alerts and stays as it is.
  if (/\bteam\b/i.test(g)) {
    if (!/[,!.]$/.test(g)) { t.body[0] = g + ','; done.push(t.tab + ' (comma)'); }
    return;
  }

  const named = (g.match(/\[([^\]]+)\]/) || [])[1] || '';

  if (wrongName(rule, named)) {
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
}

// The SMS carries its own greeting and it drifted from the email's: consignors
// greeted as customers, staff alerts greeting the dealership by name. Same rule,
// but rewritten in place, because Ben wrote the greeting and the sentence it
// runs into as one line and smsPanel() splits them again at render time.
function fixSmsGreeting(t, rule, done) {
  const s = (t.sms[0] || '').trim();
  const g = s.match(/^(hi|hello|dear)\s*,?\s*\[([^\]]*)\]\s*,?\s*/i);
  if (g) {
    if (/\bteam\b/i.test(g[2]) || !wrongName(rule, g[2])) return;
  } else {
    // "Hi, thanks for choosing DealerCore" - a greeting with nobody in it.
    const bare = s.match(/^(hi|hello|dear)\s*,\s*/i);
    if (!bare) return;
    t.sms[0] = bare[1] + ' ' + rule.name + ', ' + s.slice(bare[0].length);
    done.push(t.tab + ' SMS (no name -> ' + rule.name + ')');
    return;
  }
  t.sms[0] = g[1] + ' ' + rule.name + ', ' + s.slice(g[0].length);
  done.push(t.tab + ' SMS (' + g[2] + ' -> ' + rule.name + ')');
}

function normaliseGreetings(templates) {
  const done = [];
  templates.forEach((t) => {
    if (t.isLayout) return;
    const rule = GREETS[t.channels.recipient] || GREETS.System;
    fixEmailGreeting(t, rule, done);
    fixSmsGreeting(t, rule, done);
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

// A label above a list of labelled rows says nothing the rows do not already say:
// "Consignment Details:" over Vehicle / VIN / Sale Date / Sale Amount is a heading
// for a table that reads itself. Dropped where a template has exactly one block.
// The five templates that stack several blocks keep their headings, because there
// the heading is what separates Customer Details from Vehicle Details rather than
// announcing that details follow.
const isRow = (l) => /^[•·-]?\s*[^:]{2,45}:\s*\S/.test(l);
const isHeading = (l) => !isRow(l) && /^[A-Z][A-Za-z'&/ ]{2,40}\s*:?$/.test(l.trim());

function dropSingleBlockHeadings(templates) {
  const done = [];
  templates.forEach((t) => {
    const at = [];
    t.body.forEach((l, i) => {
      if (isHeading(l) && t.body[i + 1] && isRow(t.body[i + 1])) at.push(i);
    });
    if (at.length !== 1) return;
    done.push(t.tab + ' ("' + t.body[at[0]].trim() + '")');
    t.body.splice(at[0], 1);
  });
  return done;
}

// "Reach out" is American register and the set says "get in touch" everywhere
// else. Ordered longest-first so "reach out to us" and "reach out to [X]" each
// land on wording that still reads, rather than "get in touch with us".
const REACH = [
  [/\breach out to us\b/gi, 'get in touch'],
  [/\breach out to (\[[^\]]+\])/gi, 'get in touch at $1'],
  [/\breach out to\b/gi, 'get in touch with'],
  [/\breach out\b/gi, 'get in touch'],
];

// The replacement has to keep the case of what it replaced: these appear both
// mid-sentence and at the start of one ("Questions? Reach out to ...").
const keepCase = (was, now) => (/^[A-Z]/.test(was) ? now.charAt(0).toUpperCase() + now.slice(1) : now);

function sayGetInTouch(templates) {
  const done = [];
  templates.forEach((t) => {
    let hit = false;
    const swap = (s) => REACH.reduce((acc, [re, to]) => acc.replace(re, (m, g1) => {
      hit = true;
      return keepCase(m, to.replace('$1', g1 || ''));
    }), s);
    t.body = t.body.map(swap);
    t.sms = t.sms.map(swap);
    if (hit) done.push(t.tab);
  });
  return done;
}

// One exclamation mark carries the good news; a second spends it. Ben wrote ten
// messages with two. The first stays, the rest become full stops.
function oneExclamation(templates) {
  const done = [];
  const trim = (lines, tab) => {
    if ((lines.join(' ').match(/!/g) || []).length < 2) return lines;
    let first = true;
    done.push(tab);
    return lines.map((l) => l.replace(/!/g, () => (first ? ((first = false), '!') : '.')));
  };
  templates.forEach((t) => {
    t.sms = trim(t.sms, t.tab);
    t.body = trim(t.body, t.tab);
  });
  return [...new Set(done)];
}

// Three detail blocks repeat a row: the finance emails list the dealer mobile
// twice and Finance Documents Required asks for the same document twice.
function dedupeAdjacentLines(templates) {
  const done = [];
  templates.forEach((t) => {
    const out = t.body.filter((l, i) => i === 0 || l.trim() !== t.body[i - 1].trim());
    if (out.length !== t.body.length) { done.push(t.tab); t.body = out; }
  });
  return done;
}

// A sign-off pasted into the body, above the real signature block, would give
// the email two of them. The page renders its own from the sheet's signature.
function stripBodySignOff(templates) {
  const done = [];
  templates.forEach((t) => {
    const out = t.body.filter((l) => !/^(kind regards|best regards|regards|sincerely|yours faithfully)[,.]?$/i.test(l.trim()));
    if (out.length !== t.body.length) { done.push(t.tab); t.body = out; }
  });
  return done;
}

// "Mobile: [Mobile Number]" reporting a lead's number to staff is data and
// stays. The same row on customer mail is the dealership handing out its number
// to be rung, which is a call-to-action in a table.
function dropCustomerPhoneRows(templates) {
  const done = [];
  templates.forEach((t) => {
    if (!NO_LOGIN.includes(t.channels.recipient)) return;
    const out = t.body.filter((l) => !/^(mobile|phone|contact number)\s*:\s*\[[^\]]*(number|mobile|phone)[^\]]*\]$/i.test(l.trim()));
    if (out.length !== t.body.length) { done.push(t.tab); t.body = out; }
  });
  return done;
}

// A sentence in an SMS has to start with a capital. Rewriting a phone
// call-to-action mid-sentence leaves the replacement carrying the original's
// lowercase start, so this runs after every pass that edits SMS text.
function capitaliseSentences(templates) {
  const done = [];
  // Not inside a placeholder: "[Required Documents, e.g. photo ID]" must keep
  // its lower case, so the fix only applies outside square brackets.
  const fix = (line, tab) => {
    const out = line.replace(/(\[[^\]]*\])|([.?!]\s+)([a-z])/g,
      (m, ph, sep, ch) => (ph ? ph : sep + ch.toUpperCase()));
    if (out !== line) done.push(tab);
    return out;
  };
  templates.forEach((t) => {
    t.sms = t.sms.map((l) => fix(l, t.tab));
    t.body = t.body.map((l) => fix(l, t.tab));
  });
  return [...new Set(done)];
}

// DealerCore is web only, so this channel is an in-app notification in the
// dashboard, not an OS-level push to a registered device. That means it can only
// reach someone who logs in: dealers, their staff and admin. Customers and
// consignors have no account, so the catalogue's tick against every one of their
// templates describes a send with nowhere to arrive.
const NO_LOGIN = ['Customer', 'Consignor', 'Seller'];

function limitInApp(templates) {
  const done = [];
  templates.forEach((t) => {
    if (t.isLayout) return;
    // A template that sets the channel itself has a reason, so leave it alone.
    const rule = rules[t.tab];
    if (rule && rule.channels && 'push' in rule.channels) return;
    const want = !NO_LOGIN.includes(t.channels.recipient);
    if (t.channels.push === want) return;
    t.channels.push = want;
    done.push(t.tab + ' ' + (want ? 'on' : 'off'));
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
    (t) => !(rules[t.tab] && rules[t.tab].signatureCategory) &&
      n && new RegExp(n[0]).test(t.sigCategory) && (t.signature || []).length
  );
  return donor ? donor.signature.slice() : null;
}

const addFile = path.join(__dirname, '..', '..', 'data', 'added.json');
const added = fs.existsSync(addFile) ? JSON.parse(fs.readFileSync(addFile, 'utf8')) : [];

// A proposed template the owner rejected. It never existed, so there is nothing
// for the dev team to retire and no reason to show it.
function dropTemplates(templates) {
  const done = [];
  for (let i = templates.length - 1; i >= 0; i--) {
    const rule = rules[templates[i].tab];
    if (!rule || !rule.drop) continue;
    done.push(templates[i].tab);
    templates.splice(i, 1);
  }
  return done.reverse();
}

// A status the journey needs but the sheet never had a tab for.
function addTemplates(templates) {
  const done = [];
  added.forEach((a) => {
    if (templates.some((t) => t.tab === a.tab)) return;
    const donor = templates.find((t) => new RegExp(String(a.sigCategory).match(/[12]/)[0]).test(t.sigCategory) && (t.signature || []).length);
    templates.push({
      tab: a.tab,
      originalTitle: a.tab,
      renamedFrom: '',
      category: a.category || '',
      trigger: a.trigger || '',
      sigCategory: a.sigCategory,
      reviewStatus: '',
      channels: Object.assign({ email: true, sms: true, push: false, internal: false }, a.channels),
      subject: a.subject,
      body: a.body.slice(),
      sms: (a.sms || []).slice(),
      smsNote: '',
      redundantTo: '',
      redundant: false,
      why: [],
      signatureNote: '',
      signature: donor ? donor.signature.slice() : [],
      devLinks: [],
      hasOldInSheet: false,
    });
    done.push(a.tab);
  });
  return done;
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

    // Where the sheet's copy is not wrong but answers the wrong event, line
    // edits cannot get there. setBody/setSms replace the copy outright, so the
    // rewrite is stated in one place rather than assembled from five anchors.
    if (rule.setBody) {
      applied.push({ tab: t.tab, ok: true,
        what: 'body replaced (' + t.body.length + ' -> ' + rule.setBody.length + ' lines)' });
      t.body = rule.setBody.slice();
      // Ben's notes describe edits to copy that no longer exists ("changed to
      // Australian English spelling" against a paragraph that has gone), so the
      // override's own notes stand alone, as they do for a layout.
      t.why = [];
    }

    // Where the Blade file is not what production actually sends, the old side
    // can be replaced by the dev team's own description of the live email.
    if (rule.setOldPreview) {
      applied.push({ tab: t.tab, ok: true, what: 'old preview replaced' });
      t.oldPreview = rule.setOldPreview;
    }

    if (rule.setInApp) {
      applied.push({ tab: t.tab, ok: true, what: 'in-app line set' });
      t.inApp = rule.setInApp;
    }

    if (rule.setSms) {
      applied.push({ tab: t.tab, ok: true, what: 'sms replaced' });
      t.sms = rule.setSms.slice();
    }

    // The sheet's tab name is the join key to the live template, so a rename sets
    // a display name beside it rather than replacing it. The page shows the Blade
    // file path anyway, which is what the dev team actually navigates by.
    if (rule.name && rule.name !== t.tab) {
      applied.push({ tab: t.tab, ok: true, what: 'displayed as "' + rule.name + '"' });
      t.displayName = rule.name;
    }

    // A template nobody can build yet: something has to be answered first. Draws
    // a red dot in the sidebar so it stays findable among the other 99.
    if (rule.flag || rule.flagNote) {
      applied.push({ tab: t.tab, ok: true, what: 'flagged for an answer' });
      t.flagged = true;
      // Sits above the previews, not in the change list. A question the dev team
      // has to answer before building is not one of twelve bullets at the bottom.
      if (rule.flagNote) t.flagNote = rule.flagNote;
    }

    // Not a question: something to know while building.
    if (rule.note) {
      applied.push({ tab: t.tab, ok: true, what: 'build note added' });
      t.noteBar = rule.note;
    }

    // limitInApp() keys off the recipient, which is right for the other 99: a
    // customer has no login. It cannot see that a Dealer template fires before
    // the account exists, so those switch the channel off explicitly.
    Object.entries(rule.channels || {}).forEach(([k, v]) => {
      if (t.channels[k] === v) return;
      applied.push({ tab: t.tab, ok: true, what: 'channel ' + k + ' ' + t.channels[k] + ' -> ' + v });
      t.channels[k] = v;
    });

    // An explicit button label, for templates whose whole purpose is the click.
    if (rule.cta) {
      applied.push({ tab: t.tab, ok: true, what: 'call-to-action "' + rule.cta + '"' });
      t.cta = rule.cta;
      if (rule.ctaAfter) t.ctaAfter = rule.ctaAfter;
    }

    if (rule.recipient && rule.recipient !== t.channels.recipient) {
      applied.push({ tab: t.tab, ok: true, what: 'recipient ' + t.channels.recipient + ' -> ' + rule.recipient });
      t.channels.recipient = rule.recipient;
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

module.exports = { applyOverrides, applySubjects, normaliseGreetings, removeCallToActions, limitInApp, oneExclamation, dropSingleBlockHeadings, sayGetInTouch, capitaliseSentences,
  dedupeAdjacentLines, stripBodySignOff, dropCustomerPhoneRows, addTemplates, dropTemplates, rules };
