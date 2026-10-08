// Assemble the deliverable: for every template, what goes out today next to what
// replaces it, plus SMS and the in-app notification. One self-contained file.
const fs = require('fs');
const path = require('path');

const { renderEmail, cleanSignature, sigName, DISCLAIMER, SIGN_OFF } = require('./lib/wrapper.js');
const { templateNotes } = require('./lib/why.js');
const { defs: LOGO_DEFS, lockup } = require('./lib/logo.js');
const { defs: SOCIAL_DEFS } = require('./lib/social.js');
const { defs: DEALER_DEFS } = require('./lib/dealership.js');
const { defs: ICON_DEFS, icon } = require('./lib/icons.js');
const CSS = require('./lib/styles.js');

const R = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'));
const olds = R('old_templates.json');
const { templates: news, reference } = R('new_templates.json');
const { rows: joinRows } = R('join_map.json');
const qa = R('qa_old.json');
// How each template stands against the dev team's own notification list. Absent
// on a fresh clone, and absent per template when the two agree.
let inventory = {};
try { inventory = R('data/inventory.json'); } catch (e) { /* not supplied */ }
// Each v0.2 row's own name and status, straight from the export, so the mapping
// shown on a template is in the dev team's words, row by row.
let V02 = {};
try { V02 = R('data/v02-rows.json'); } catch (e) { /* not supplied */ }
// Templates the owner has signed off. The only mark in the sidebar: everything
// else about a template is carried by the chips on the template itself.
let finalised = [];
try { finalised = R('data/finalised.json'); } catch (e) { /* not supplied */ }
const DONE = new Set(finalised);
// Only the owner decides this. Retiring a template is not the same as settling
// it, and nothing else may put a dot on the list.
const isDone = (m) => DONE.has(m.n.tab);
// The chip carries the Inventory's own wording, so a reader holding both can
// match them without translating, plus the row it sits on there. A template can
// answer to two rows (one layout serving two sends), hence the plural.
const INV_CLASS = {
  'Matched': 'INVOK',
  'Partially Matched': 'PARTIAL',
  'Only in v0.1': 'NOTLISTED',
};
// Every row the template answers to, with v0.2's own name and status for it.
const v02Map = (m) => {
  const e = inventory[m.n.tab];
  if (!e || !(e.rows || []).length) return 'Not on your list';
  return e.rows.map((r) => 'Row ' + r + ': ' + esc((V02[r] || {}).action || '?') +
    ((V02[r] || {}).status ? ' (' + esc(V02[r].status) + ')' : '')).join('; ');
};
// Superseded by v02Map in the details line; kept so the call sites stay simple.
const invChip = (m) => {
  return '';
  // A settled template has had its question answered, so the status it held
  // against the dev team's list is history. The green dot in the sidebar is the
  // only mark it needs.
  if (isDone(m)) return '';
  const e = inventory[m.n.tab];
  if (!e || !e.status) return '';
  const cls = INV_CLASS[e.status] || 'soft';
  const where = e.rows && e.rows.length
    ? ' &middot; ' + (e.rows.length > 1 ? 'Rows ' : 'Row ') + e.rows.join(', ')
    : '';
  return '<span class="chip ' + cls + '">' + esc(e.status) + where + '</span>';
};

const oldById = new Map(olds.map((o) => [o.id, o]));
const joinByTab = new Map(joinRows.map((r) => [r.tab, r]));
const qaById = qa.reduce((a, f) => ((a[f.id] = a[f.id] || []).push(f), a), {});

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');
const slug = (s) => 't-' + String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// A renamed template keeps its sheet tab as the join key and the anchor; only the
// label changes. Search matches either, so an old name still finds it.
const shown = (n) => n.displayName || n.tab;

// Blade asset helpers resolve at render time, so in a static preview they would
// show as broken images. Swap them for a neutral placeholder instead.
function previewDoc(blade) {
  const body = blade
    // Blade strips {{-- --}} comments before the mail ever renders, so leaving
    // them in would put text at the top of the preview that no recipient sees.
    // 76 of the 90 live templates carry at least one.
    .replace(/\{\{--[\s\S]*?--\}\}/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<img[^>]*>/gi, (tag) =>
      /\{\{|\{!!/.test(tag)
        ? '<div style="background:#e8edf1;color:#8b98a4;font:11px sans-serif;padding:16px;text-align:center;border-radius:6px;margin:0 0 10px">[ image ]</div>'
        : tag);
  // Warm ground for the old side; the new side sits on a cool one. The pair
  // reads as "before / after" at a glance without shouting.
  return '<!doctype html><meta charset="utf-8">' +
    '<style>body{font:14px/1.6 Inter,system-ui,sans-serif;margin:0;padding:18px;color:#4a4441;background:#faf8f6}' +
    'img{max-width:100%}table{max-width:100%}</style>' + body;
}

// A supplied description of the live email rather than a Blade file: set on the
// same warm ground as the Blade previews so the two sides still read as a pair.
function plainDoc(lines) {
  const body = lines.map((l) => {
    const m = /^([A-Z][A-Za-z ]{2,12}):s*(.*)$/.exec(l);
    return m
      ? '<p><span style="display:block;font:700 10px/1.6 sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#a2968c">' +
        esc(m[1]) + '</span>' + esc(m[2]) + '</p>'
      : '<p>' + esc(l) + '</p>';
  }).join('');
  return '<!doctype html><meta charset="utf-8">' +
    '<style>body{font:14px/1.6 Inter,system-ui,sans-serif;margin:0;padding:18px;color:#4a4441;background:#faf8f6}' +
    'p{margin:0 0 13px}</style>' + body;
}

// Recipient is a more useful grouping than the sheet's loose categories, whose
// "Others" bucket is a catch-all.
// A template written during the review has no Blade file, so the old side has
// nothing to render. Where it answers to a row on the dev team's own list, that
// row is what it replaces, so the row is what the old side shows.
const DEV_ROWS = (() => {
  const out = {};
  let text = '';
  try { text = fs.readFileSync(path.join(__dirname, '..', 'data', 'register.csv'), 'utf8'); }
  catch (e) { return out; }
  const split = (l) => {
    const f = []; let cur = '', q = false;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (c === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (c === ',' && !q) { f.push(cur); cur = ''; }
      else cur += c;
    }
    f.push(cur); return f;
  };
  text.split(/\r?\n/).filter(Boolean).slice(1).forEach((l) => {
    const f = split(l);
    if (!/^DEV-\d+$/.test(f[0])) return;
    out[f[0]] = { module: f[1], flow: f[2], name: f[3], subject: f[4], recipient: f[5] };
  });
  return out;
})();

function devRowPane(ref, sheet) {
  const r = DEV_ROWS[ref];
  if (!r && !sheet) return '';
  const row = (k, v, cls) => v ? '<tr><td class="dc-dt-l">' + esc(k) + '</td>' +
    '<td class="dc-dt-v' + (cls ? ' ' + cls : '') + '">' + esc(v) + '</td></tr>' : '';
  // Where the sheet's own cells have been copied in, they are shown as written,
  // because what it holds is the point: a body of broken code fragments is not
  // copy anybody can check this against.
  const cells = sheet ? row('Subject', sheet.subject) + row('Greeting', sheet.greeting) +
      row('Body', sheet.body, 'raw') + row('Signature', sheet.signature) +
      row('Footer', sheet.footer, 'raw')
    : (r ? row('Subject', r.subject) : '');
  // Where the sheet's cells are in hand they are the whole of it. Our own
  // reading of the row adds nothing the dev team does not already have.
  const context = (r && !sheet) ? row('Module', r.module) + row('Flow', r.flow) +
      row('Notification', r.name) + row('Recipient', r.recipient) : '';
  return '<div class="devrow">' +
    '<table class="dc-details"><tbody>' + context + cells + '</tbody></table></div>';
}

// Unmatched holds rows on the dev team's list that no template here answers
// to. It comes last, so nothing already numbered moves.
const GROUPS = ['Customer', 'Dealer', 'Staff', 'System', 'Unmatched'];
// A consignor is a kind of customer, so they sit in that group rather than
// adding a fifth heading for six templates.
const IN_GROUP = { Consignor: 'Customer', Seller: 'Customer', Supplier: 'Customer' };
// Nobody in these two groups has a DealerCore account.
const NO_LOGIN = ['Customer', 'Consignor', 'Seller', 'Supplier'];
// The grouping keys stay as they are, because NO_LOGIN and IN_GROUP read them.
// Only what the reader sees changes: "System" read as machine-generated when it
// means the DealerCore team, and "Dealer" names the business rather than the
// person. The owner's word for that person is "Account Owner", which is also v0.2's.
const LABEL = { System: 'DealerCore', Dealer: 'Account Owner', Unmatched: 'Unmatched' };
const label = (r) => LABEL[r] || r;

const groupOf = (m) => {
  const r = m.n.group || IN_GROUP[m.n.channels.recipient] || m.n.channels.recipient;
  return GROUPS.includes(r) ? r : 'System';
};

// What the sidebar shows. Dealer and Staff share one heading, with the "To" line
// saying who inside the dealership receives each send. Sorting still runs on
// GROUPS, so the Dealer block stays ahead of the Staff block and no number
// already handed to the dev team moves.
const SECTIONS = ['Customer', 'Dealership', 'System', 'Unmatched'];
const IN_SECTION = { Dealer: 'Dealership', Staff: 'Dealership' };
const sectionOf = (m) => IN_SECTION[groupOf(m)] || groupOf(m);

// The dev team's own description of who receives it, where we have one.
const toOf = (m) => m.n.to || label(m.n.channels.recipient) || '—';

const model = news.map((n) => {
  const j = joinByTab.get(n.tab) || { status: 'NEW' };
  const o = j.oldId ? oldById.get(j.oldId) : null;
  // Retired is not redundant: nothing duplicates it, it is simply no longer needed.
  const status = n.isLayout ? 'LAYOUT' : n.retired ? 'RETIRED' : n.redundant ? 'REDUNDANT' : !o ? 'NEW' : 'REVISED';

  // Ben's notes, plus anything the scan of the live template turned up that he
  // did not record. Both describe what the replacement fixes.
  const notes = templateNotes(n.why);
  (qaById[j.oldId] || []).forEach((f) => {
    if (f.kind === 'wrong-legal-entity' && /PTY LTD/i.test(f.evidence)) {
      notes.push('The old template carried another company’s legal identity (' +
        f.evidence.replace(/^This email is from\s*/i, '') +
        '). Now replaced by the standard DealerCore disclaimer.');
    }
  });

  // Anything the dev team has to physically attach to the send. Flagged because
  // it is work beyond the copy: the file has to be generated and bound in.
  const text = [n.subject, ...n.body].join('\n');
  const hasAttachment = /\battach(ed|ment|ments)\b/i.test(text) ||
    /\[Attachment[^\]]*\]/i.test(text) ||
    /please find (the )?(following|below)/i.test(text);

  return { n, o, join: j, status, hasAttachment, flagged: !!n.flagged, flagNote: n.flagNote || '', noteBar: n.noteBar || '', notes: [...new Set(notes)] };
});

// Reading order follows the sidebar grouping, so the numbers run 1..100 straight
// down the nav, the "N of 100" counter agrees with them, and prev/next walks the
// list in the order it is displayed. Sort is stable, so order within a group is
// the sheet's own.
// Positions already handed to the dev team. A template listed in data/order.json
// keeps its number for good, so work done later cannot push a settled template
// up or down the list while somebody is building from it. Anything not listed
// falls in behind, settled first.
const FROZEN = (() => {
  try {
    const f = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'order.json'), 'utf8')).frozen || [];
    return new Map(f.map((tab, i) => [tab, i]));
  } catch (e) { return new Map(); }
})();
const rank = (m) => {
  if (FROZEN.has(m.n.tab)) return FROZEN.get(m.n.tab);
  // Settled since the freeze: joins the end of its group's settled block, in the
  // order it was settled. Sheet order would let a later sign-off jump ahead of
  // one already handed over.
  if (isDone(m)) return 100000 + finalised.indexOf(m.n.tab);
  // Moved in from another group: joins the end of the open block, so it does
  // not jump ahead of templates already waiting there.
  return (m.n.group ? 300000 : 200000) + news.indexOf(m.n);
};

model.sort((a, b) => {
  const g = GROUPS.indexOf(groupOf(a)) - GROUPS.indexOf(groupOf(b));
  if (g) return g;
  return rank(a) - rank(b);
});

// The page goes straight to the dev team as an instruction, so these state the
// decision without arguing for it.
// Messages follow the same shape as the emails: greeting, body, sign-off.
// Ben wrote the SMS as a single run of text, so the greeting is split back out
// and the sign-off added to match the template's signature category.
function smsPanel(m) {
  if (m.n.onHold) return holdPanel(m);
  // A retired template sends nothing on any channel. clearBody empties the body
  // but leaves the SMS behind, which showed live copy for a template nobody
  // should build.
  if (m.n.redundant || !m.n.sms.length) return '<p class="ruled">Not required for this template.</p>';

  const text = m.n.sms.join(' ').trim();
  const g = text.match(/^((?:Hi|Hello|Dear)\s+\[[^\]]+\]\s*,)\s*(.*)$/i);
  const greeting = g ? g[1].trim() : '';
  // Ben wrote the greeting and body as one sentence ("Hi [X], great news!").
  // Once the greeting moves to its own line the body has to start a sentence.
  let body = g ? g[2].trim() : text;
  if (g && /^[a-z]/.test(body)) body = body[0].toUpperCase() + body.slice(1);

  const isCat1 = /1/.test(String(m.n.sigCategory));
  const signoff = isCat1 ? [SIGN_OFF, "[User's Name]", '[Dealership Name]'] : [SIGN_OFF, 'Team DealerCore'];

  return '<div class="bubble">' +
      (greeting ? '<div class="sms-g">' + esc(greeting) + '</div>' : '') +
      '<div class="sms-b">' + esc(body) + '</div>' +
      '<div class="sms-s">' + signoff.map((l) => '<div>' + esc(l) + '</div>').join('') + '</div>' +
    '</div>' +
    '<div class="to">To ' + esc(toOf(m)) + '</div>';
}

// A sentence that is only courtesy carries nothing in a notification panel.
const COURTESY = /^(?:thank(?:s| you)\b[^.!?]*|welcome to dealercore[^.!?]*|congratulations\b[^.!?]*|we(?:'|\u2019)?re (?:excited|delighted) to[^.!?]*)[.!?]?$/i;

// These introduce the fact rather than being it, so they come off the front.
const WIND_UP = [
  /^we(?:'|\u2019)?re (?:thrilled|delighted|pleased|excited|happy) to (?:inform you that|let you know that|confirm that|confirm|share that)\s*/i,
  /^we(?:'|\u2019)?re (?:writing|getting in touch) (?:to (?:confirm|let you know) that|with|about)\s*/i,
  /^we are writing to confirm\s*/i,
  /^(?:great|good) news[!,.]?\s*/i,
  /^congratulations[!,.]?\s*/i,
  /^(?:this is |just )?a friendly reminder that\s*/i,
  /^just a heads up[:,]?\s*/i,
  /^this (?:email )?confirms that\s*/i,
];

// A labelled row is data, not a sentence, and reads as noise in a panel.
const DETAIL_ROW = /^[\u2022\u00b7-]?\s*[A-Z][A-Za-z /()\u2019'-]{2,40}\s*:\s*\S/;

// The email is the source, so the notification can never drift from it.
function inAppBody(n) {
  const lines = n.body.filter((l) => {
    const s = String(l).trim();
    return s && !/^(hi|hello|dear)\b/i.test(s) && !DETAIL_ROW.test(s);
  });
  for (const line of lines) {
    const sentences = String(line).trim().split(/(?<=[.!?])\s+/);
    for (let s of sentences) {
      if (COURTESY.test(s.trim())) continue;
      WIND_UP.forEach((re) => { s = s.replace(re, ""); });
      s = s.trim();
      // A line ending in a colon introduces something that is not coming.
      if (s.length < 12 || /[:;]$/.test(s)) continue;
      if (s.length > 130) s = s.slice(0, 127).replace(/\s+\S*$/, "") + "...";
      return s.charAt(0).toUpperCase() + s.slice(1);
    }
  }
  return '';
}

// DealerCore is web only, so this is the dashboard notification, not an
// OS-level push. Copy mirrors the SMS: it was never written separately.
function inAppPanel(m) {
  if (m.n.onHold) return holdPanel(m);
  if (!m.n.channels.push || m.n.redundant) return '<p class="ruled">Not required for this template.</p>';
  // A notification title is not an email subject: it is short, sentence case and
  // leads with the event, with the specifics on the line below. Where a template
  // has not been given one, the subject still stands in.
  return '<div class="push"><span class="tx">' +
      '<span class="ti">' + esc(m.n.inAppTitle || m.n.subject || shown(m.n)) + '</span>' +
      '<span class="bd">' + esc(m.n.inApp || inAppBody(m.n)) + '</span>' +
    '</span></div>' +
    '<div class="to">To ' + esc(toOf(m)) + '</div>';
}

// Prev/next let a reviewer walk the whole set in order without going back to
// the sidebar between each one.
function pager(i, order) {
  const prev = order[i - 1];
  const next = order[i + 1];
  const link = (t, dir, cls) =>
    '<a class="' + cls + '" href="#' + t.id + '"><span>' + dir + '</span>' +
      '<em>' + (t.num ? '<b>' + t.num + '</b>' : '') + esc(t.label) + '</em></a>';
  return '<div class="pagenav">' +
    (prev ? link(prev, 'Previous', 'pv') : '<span></span>') +
    (next ? link(next, 'Next', 'nx') : '') +
    '</div>';
}

// External and System Notification are Blade layouts that other notifications
// render through. They stay listed so nobody wonders where they went, but there
// is no copy to review and no subject to set.
function layoutSection(m, i, order) {
  const id = slug(m.n.tab);
  return '<section class="tpl" id="' + id + '" data-status="' + m.status +
    '" data-name="' + attr((shown(m.n) + ' ' + m.n.tab).toLowerCase()) + '">' +
    '<div class="crumb">' + esc(label(sectionOf(m))) + '<span>' + i + ' of ' + (order.length - 1) + '</span></div>' +
    '<div class="tpl-head"><h2>' + esc(shown(m.n)) + '</h2>' +
      '<span class="chip LAYOUT">Layout</span>' + invChip(m) + '</div>' +
    '<div class="meta"><span><b>v0.2</b> ' + v02Map(m) + '</span></div>' +
    '<div class="cols"><div><div class="pane old"><div class="pane-h">Old (as sent today)</div>' +
      (m.o ? '<iframe sandbox="allow-same-origin" srcdoc="' + attr(previewDoc(m.o.blade)) + '"></iframe>' : '') +
    '</div></div><div class="newcol">' +
      '<div class="pane new"><div class="pane-h"><span>Copy</span></div>' +
        '<div class="panel"><div class="chan">' +
          '<p class="ruled"><b>Layout, not a notification.</b></p>' +
          (m.notes.length ? '<ul class="layoutnote">' + m.notes.map((w) => '<li>' + esc(w) + '</li>').join('') + '</ul>' : '') +
        '</div></div>' +
      '</div>' +
    '</div>' + pager(i, order) + '</section>';
}

// One template that sends in several versions (an upgrade, a downgrade, a
// cancellation) shows each version in turn under its own label, on every
// channel. A version only overrides what differs; the rest is the template's.
function versions(m) {
  if (!(m.n.variants || []).length) return [{ label: '', m }];
  return m.n.variants.map((v) => {
    const n = Object.assign({}, m.n);
    ['subject', 'body', 'sms', 'inAppTitle', 'inApp', 'cta', 'ctaAfter'].forEach((k) => { if (v[k] !== undefined) n[k] = v[k]; });
    return { label: v.label, m: Object.assign({}, m, { n }) };
  });
}

// Renders each version of one channel in its own wrapper, only the first
// showing; the version tabs switch between them. The To line is the same for
// every version, so it is kept once, at the end.
function stacked(m, render) {
  const vs = versions(m);
  if (vs.length === 1) return render(m);
  const TO = /<div class="to">[\s\S]*?<\/div>$/;
  let to = '';
  const out = vs.map((v, i) => {
    let html = render(v.m);
    const hit = html.match(TO);
    if (hit) { to = hit[0]; html = html.slice(0, hit.index); }
    return '<div class="vpanel' + (i ? ' hide' : '') + '" data-v="' + i + '">' + html + '</div>';
  }).join('');
  return out + to;
}

const isNew = (m) => !m.o && !m.n.devRow && !m.n.devSheet &&
  (!inventory[m.n.tab] || inventory[m.n.tab].status === 'Only in v0.1');

// The copy panel is what the dev team reads, so an on-hold template says there
// what happens next rather than leaving them to find the question above.
const holdPanel = (m) => '<div class="hold"><b>On hold. Nothing to build yet.</b>' +
  '<p><b>What’s next:</b> ' + esc(m.n.holdNext || 'the dev team confirms the flow to the AU team.') + '</p>' +
  '<p>Once that is answered, the AU team writes the copy for this template.</p></div>';

// "Upgrade, Downgrade and Cancellation"
const listOf = (xs) => xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];

function section(m, i, order) {
  const id = slug(m.n.tab);
  const c = m.n.channels;

  // No separate subject field: the email renders the subject as its headline,
  // so a labelled field above the preview would show the same text twice.
  // The old side only ever has an email, so the channel tabs belong to the new
  // panel rather than to the whole template.
  const emailPanel = m.n.onHold ? holdPanel(m)
    : m.n.body.length
    ? stacked(m, (m) => renderEmail({
        sigCategory: m.n.sigCategory,
        subject: m.n.subject,
        body: m.n.body,
        signature: m.n.signature,
        // Only offered to someone who can actually sign in. A customer or
        // consignor has no DealerCore account, so the button would land them
        // on a login screen for a product that is not theirs.
        // Explicit only. This used to be a keyword match on the subject line, so
        // any subject containing "update" or "review" grew a button nobody chose.
        cta: m.n.cta || '',
        ctaAfter: m.n.ctaAfter || '',
      }))
    : m.n.retired ? '<p class="none">Retired. This email is no longer needed.</p>'
    : '<p class="none">Marked redundant' + (m.n.redundantTo ? ' to “' + esc(m.n.redundantTo) + '”' : '') + '.</p>';

  // A layout has no copy to show, so it gets a plain statement instead of the
  // channel tabs, which would only offer three empty panels.
  if (m.n.isLayout) {
    return layoutSection(m, i, order);
  }

  const oldPane = '<div class="pane old"><div class="pane-h">Old (as sent today)</div>' +
    (m.n.oldPreview
      ? '<iframe sandbox="allow-same-origin" srcdoc="' + attr(plainDoc(m.n.oldPreview)) + '"></iframe>'
      : m.o
      // allow-same-origin only, so the parent can measure the rendered height.
      // Scripts stay blocked: without allow-scripts nothing inside can execute.
      ? '<iframe sandbox="allow-same-origin" srcdoc="' + attr(previewDoc(m.o.blade)) + '"></iframe>'
      // Where the dev list's own cells have been pasted in, they are the old
      // side. Otherwise there is nothing to compare against, and saying so is
      // all the old side needs to do.
      : (m.n.devSheet && devRowPane(m.n.devRow, m.n.devSheet))
        || '<p class="none">This is new.</p>') +
    '</div>';

  const newPane = '<div class="pane new">' +
    '<div class="pane-h"><span>Copy</span>' +
      // A channel that isn't used keeps its tab but is struck through, so the
      // full channel set stays legible at a glance.
      '<span class="tabs">' +
        '<button class="tab on" data-p="email">' + icon('email') + '<span>Email</span></button>' +
        '<button class="tab' + (m.n.sms.length ? '' : ' empty') + '" data-p="sms">' + icon('sms') + '<span>SMS</span></button>' +
        '<button class="tab' + (m.n.channels.push && !m.n.onHold ? '' : ' empty') + '" data-p="push">' + icon('push') + '<span>In-app</span></button>' +
      '</span>' +
    '</div>' +
    // Which version is showing. A second row, so it reads as a choice on top
    // of the channel rather than as another channel.
    ((m.n.variants || []).length
      ? '<div class="vtabs"><span class="vlab">Version</span>' +
          m.n.variants.map((v, i) => '<button class="vtab' + (i ? '' : ' on') + '" data-v="' + i + '">' + esc(v.label) + '</button>').join('') +
        '</div>'
      : '') +
    '<div class="panel" data-p="email">' + emailPanel + '</div>' +
    '<div class="panel hide" data-p="sms"><div class="chan">' + stacked(m, smsPanel) + '</div></div>' +
    '<div class="panel hide" data-p="push"><div class="chan">' + stacked(m, inAppPanel) + '</div></div>' +
    '</div>';

  const meta = '<div class="meta">' +
    '<span><b>Trigger</b> ' + esc(m.n.trigger || '—') + '</span>' +
    // No channel chips here: the tabs on the New panel already carry that, and
    // showing both meant reading the same fact twice. "Sent as" lives here
    // rather than in the New panel header, where it collided with the tabs.
    '<span><b>To</b> ' + esc(toOf(m)) + '</span>' +
    '<span><b>Sent as</b> ' + esc(sigName(m.n.sigCategory)) + '</span>' +
    '<span><b>v0.2</b> ' + v02Map(m) + '</span>' +
    '</div>';

  return '<section class="tpl" id="' + id + '" data-status="' + m.status +
    '" data-name="' + attr((shown(m.n) + ' ' + m.n.tab).toLowerCase()) + '">' +
    '<div class="crumb">' + esc(label(sectionOf(m))) + '<span>' + i + ' of ' + (order.length - 1) + '</span></div>' +
    // Nearly every template was revised, so that chip says nothing. Only the
    // exceptions are worth flagging.
    '<div class="tpl-head"><h2>' + esc(shown(m.n)) + '</h2>' +
      // NEW means we proposed it. A notification that is on the dev team's own
      // list but was never built is not ours, so it carries no chip.
      ((m.status === 'NEW' && !m.n.devRow) || m.status === 'REDUNDANT' || m.status === 'RETIRED'
        ? '<span class="chip ' + m.status + '">' + m.status + '</span>' : '') +
      (m.join.status === 'RENAMED' ? '<span class="chip soft">was “' + esc(m.join.oldTitle) + '”</span>' : '') +
      (m.flagged ? '<span class="chip FLAG">Flagged</span>' : '') +
      (m.n.onHold ? '<span class="chip HOLD">On hold</span>' : '') +
      ((m.n.variants || []).length ? '<span class="chip VERS">' + m.n.variants.length + ' versions</span>' : '') +
      (m.hasAttachment ? '<span class="chip ATTACH">' + icon('email') + 'Attachment</span>' : '') +
      invChip(m) +
      '</div>' +
    meta +
    (m.flagNote ? '<div class="flagbar"><b>Open question</b>' + esc(m.flagNote) + '</div>' : '') +
    // Anything on the dev team's list already exists, so only a template with no
    // live version and nothing on that list is headed as new. "Only in v0.1"
    // rows were added to the list to register our own proposals, so they count
    // as nothing there.
    (m.noteBar ? '<div class="notebar"><b>' + (isNew(m) ? 'New addition' : 'Note') + '</b>' + esc(m.noteBar) + '</div>' : '') +
    // A version behind a tab is easy to miss, so the page says outright how
    // many there are and that each one is built.
    ((m.n.variants || []).length
      ? '<div class="notebar"><b>' + m.n.variants.length + ' versions</b>This template sends in ' + m.n.variants.length +
        ' versions: ' + esc(listOf(m.n.variants.map((v) => v.label))) + '. ' +
        (m.n.variants.length === 2 ? 'Build both' : 'Build all ' + m.n.variants.length) +
        '. Switch between them with the version tabs above the copy.</div>'
      : '') +
    '<div class="cols"><div>' + oldPane + '</div><div class="newcol">' + newPane + '</div></div>' +
    pager(i, order) +
    '</section>';
}

// ---------- guidelines ----------

// Signature examples are lifted from real templates rather than retyped, so the
// guideline and the previews can never drift apart.
function sampleSignature(cat) {
  const t = news.find((n) => new RegExp(cat).test(n.sigCategory) && (n.signature || []).length);
  return t ? cleanSignature(t.signature) : [];
}

// The list is built from the templates that are settled but still carry a
// question, so it grows as the review does and never pre-empts a template
// nobody has looked at yet. Same set as the red dots in the sidebar.
const OPEN_QUESTIONS = model.filter((m) => isDone(m) && m.flagged)
  .map((m) => ({ name: shown(m.n), q: m.flagNote }));

// Questions that belong to no single template, so nothing in the model can
// carry them. Added by hand as they come up.
const SET_QUESTIONS = [
  'Where does a franchise sales enquiry go? Nothing in the set covers one, and no template here is written for it.',
  'When a dealership cancels its subscription, DealerCore is told but the dealer is not. Is a cancellation confirmation meant to go to them? Your list carries one unmatched subscription notice to the account owner that might be it.',
];

function guidelines(order) {
  const sig = (cat, scope) => {
    const name = sigName(cat);
    return '<div class="box"><h3>' + esc(name) + ' email</h3>' +
      '<p class="g-scope">' + esc(scope) + '</p>' +
      '<div class="g-sig"><div>' + SIGN_OFF + '</div>' +
        sampleSignature(cat).map((l) => '<div>' + esc(l) + '</div>').join('') +
      '</div>' +
      '<p class="g-note">' + esc(cat === '1'
        ? 'Uses the sending user’s own signature. The dealership logo sits at the top of the email; if none is set up, the dealership name is shown there instead.'
        : 'Always the standard DealerCore signature and branding.') + '</p>' +
      '<p class="g-disc">' + esc(cat === '1' ? DISCLAIMER.category1 : DISCLAIMER.category2) + '</p>' +
      '</div>';
  };

  return '<section class="tpl guide" id="guidelines" data-name="guidelines">' +
    '<div class="crumb">Start here</div>' +
    '<div class="tpl-head"><h2>Guidelines</h2></div>' +
    '<div class="row">' +
      sig('1', 'Sent to a customer, broker, lender or other external contact, off the back of something a dealership user did.') +
      sig('2', 'Sent by DealerCore itself: verification, password resets, billing, platform and security notices, plus internal staff alerts.') +
    '</div>' +
    // In-app copy is deliberately unlike the email, so the page says so rather
    // than leaving it looking like an oversight.
    '<div class="box"><h3>In-app notifications</h3><p>' +
      'A notification is a short title and one line of specifics, not the email subject repeated. ' +
      'The title says what happened, the line below says what it was, and neither carries a greeting ' +
      'or a sign-off. Templates sent to a customer have no in-app notification at all, because a ' +
      'customer has no DealerCore account.' +
    '</p></div>' +
    // The page is the only thing shared, so what is still unresolved has to be
    // readable in one place rather than only on the template it touches.
    ((OPEN_QUESTIONS.length || SET_QUESTIONS.length) ? '<div class="box open wide"><h3>Still open</h3>' +
      '<p class="g-scope">Questions we cannot answer from the copy. Each needs a call from your side before the templates they touch can be built.</p>' +
      (OPEN_QUESTIONS.length ? '<ol>' + OPEN_QUESTIONS.map((o) =>
        '<li><b>' + esc(o.name) + '</b> ' + esc(o.q) + '</li>').join('') + '</ol>' : '') +
      (SET_QUESTIONS.length ? '<p class="g-note">Across the set:</p><ol>' +
        SET_QUESTIONS.map((q) => '<li>' + esc(q) + '</li>').join('') + '</ol>' : '') +
    '</div>' : '') +
    pager(0, order) +
  '</section>';
}

// ---------- page ----------

const counts = model.reduce((a, m) => ((a[m.status] = (a[m.status] || 0) + 1), a), {});

// Reading order for the pager: guidelines first, then every template.
const order = [{ id: 'guidelines', label: 'Guidelines' }]
  .concat(model.map((m, i) => ({ id: slug(m.n.tab), label: shown(m.n), num: i + 1 })));

// Collapsible groups keep 100 entries from filling the sidebar at once.
// Sidebar numbers are the reading-order position, so they match the "N of 100"
// counter above each template rather than counting within the group.
const positionOf = new Map(model.map((m, i) => [m, i + 1]));

const nav = SECTIONS.map((g) => {
  const items = model.filter((m) => sectionOf(m) === g);
  if (!items.length) return '';
  // How many of the group are settled, so the sidebar says where the review is
  // up to rather than only how big each group is.
  const done = items.filter(isDone).length;
  const pct = Math.round((done / items.length) * 100);
  return '<details class="navgrp"><summary>' + esc(label(g)) +
      '<span class="cnt">' + done + '/' + items.length + '</span>' +
      '<i class="bar" style="--p:' + pct + '%"></i>' +
    '</summary>' +
    items.map((m) => '<a class="navlink' + (isDone(m) ? ' settled' : '') + '" href="#' + slug(m.n.tab) + '" data-status="' + m.status +
      '" data-name="' + attr((shown(m.n) + ' ' + m.n.tab).toLowerCase()) + '">' +
      '<span class="n">' + positionOf.get(m) + '</span>' +
      '<span class="nm">' + esc(shown(m.n)) +
        ((m.n.variants || []).length ? '<span class="vx">×' + m.n.variants.length + '</span>' : '') + '</span>' +
      // No status dots: every template is settled, so a dot on each said nothing.
      // Open questions show on the template itself, as the red flag bar.
      '</a>').join('') +
    '</details>';
}).join('');

const html = '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>DealerCore — Email, SMS &amp; In-app Copy</title><style>' + CSS + '</style></head><body>' +
  LOGO_DEFS + SOCIAL_DEFS + DEALER_DEFS + ICON_DEFS +
  '<div class="layout"><aside class="side">' +
    '<div class="side-title">' + lockup('dc-mark-side') + '</div>' +
    '<input class="search" id="q" type="search" placeholder="Search templates…" autocomplete="off">' +
    (() => {
      const d = model.filter(isDone).length;
      const p = Math.round((d / model.length) * 100);
      return '<div class="overall"><span>' + d + ' of ' + model.length + '</span>' +
        '<i class="bar" style="--p:' + p + '%"></i></div>';
    })() +
    '<a class="navlink navtop" href="#guidelines" data-name="guidelines">Guidelines</a>' +
    nav +
  '</aside><main class="main">' +
    '<div class="pagehead"><h1>Email, SMS &amp; in-app copy</h1>' +
      '<p class="kbd">Use <b>←</b> <b>→</b> to move between templates, <b>/</b> to search.</p></div>' +
    guidelines(order) +
    model.map((m, i) => section(m, i + 1, order)).join('') +
  '</main></div><script>' + CLIENT() + '</script></body></html>';

function CLIENT() {
  return `
var q = document.getElementById('q');
var main = document.querySelector('.main');
main.setAttribute('tabindex', '-1');

// Clicking inside the old preview moves focus into that document and the arrow
// keys stop working, so hand focus back as soon as the iframe takes it.
window.addEventListener('blur', function () {
  setTimeout(function () {
    var a = document.activeElement;
    if (a && a.tagName === 'IFRAME') { a.blur(); main.focus({ preventScroll: true }); }
  }, 0);
});

// One template on screen at a time. 100 sections in a single scroll is not
// navigable, so the hash selects which one is shown.
// Size the three channel panels to the tallest of them, so switching tabs does
// not make the page jump. Panels are display:none until active and a hidden
// element measures zero, so this can only run once the section is showing.
function fit(sec) {
  if (!sec) return;
  // With versions, only the one on show has a height; the others are hidden.
  var stage = sec.querySelector('.panel[data-p="email"] .vpanel:not(.hide) .dc-stage') ||
    sec.querySelector('.panel[data-p="email"] .dc-stage');
  var panels = sec.querySelectorAll('.panel');
  if (!panels.length) return;

  // Size both sides to the taller of the two, so neither scrolls and the
  // columns stay level.
  var frame = sec.querySelector('.pane.old iframe');
  var oldH = 0;
  try {
    var doc = frame && frame.contentDocument;
    if (doc && doc.body) oldH = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight) + 4;
  } catch (e) { oldH = 0; }

  var h = Math.max(stage ? stage.scrollHeight : 0, oldH, 320);
  if (frame) frame.style.height = h + 'px';
  panels.forEach(function (p) { p.style.height = h + 'px'; });
}

function show(id) {
  var target = document.getElementById(id);
  if (!target || !target.classList.contains('tpl')) { id = 'guidelines'; target = document.getElementById(id); }
  document.querySelectorAll('section.tpl').forEach(function (s) {
    s.classList.toggle('active', s === target);
  });
  var cur = null;
  document.querySelectorAll('.navlink').forEach(function (a) {
    var on = a.getAttribute('href') === '#' + id;
    a.classList.toggle('cur', on);
    if (on) cur = a;
  });
  if (cur) {
    var grp = cur.closest('details.navgrp');
    if (grp) grp.open = true;
    // Keep the current entry in view when paging through with the keyboard.
    if (cur.scrollIntoViewIfNeeded) cur.scrollIntoViewIfNeeded();
    else {
      var r = cur.getBoundingClientRect();
      if (r.top < 60 || r.bottom > window.innerHeight) cur.scrollIntoView({ block: 'nearest' });
    }
  }
  window.scrollTo(0, 0);

  // A srcdoc iframe may not have parsed the first time a section opens.
  fit(target);
  var frame = target && target.querySelector('.pane.old iframe');
  if (frame && !frame.dataset.fitted) {
    frame.dataset.fitted = '1';
    frame.addEventListener('load', function () { fit(target); });
  }
}

// Channel tabs are per template, so scope the toggle to the section clicked.
document.addEventListener('click', function (e) {
  var t = e.target.closest('.tab');
  if (!t) return;
  var sec = t.closest('section.tpl');
  var want = t.dataset.p;
  sec.querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('on', b === t); });
  sec.querySelectorAll('.panel').forEach(function (p) { p.classList.toggle('hide', p.dataset.p !== want); });
});

// Version tabs switch every channel at once, so moving from Upgrade to
// Downgrade keeps you on SMS if that is where you were.
document.addEventListener('click', function (e) {
  var t = e.target.closest('.vtab');
  if (!t) return;
  var sec = t.closest('section.tpl');
  var want = t.dataset.v;
  sec.querySelectorAll('.vtab').forEach(function (b) { b.classList.toggle('on', b === t); });
  sec.querySelectorAll('.vpanel').forEach(function (p) { p.classList.toggle('hide', p.dataset.v !== want); });
  fit(sec);
});

function route() { show((location.hash || '').replace(/^#/, '') || 'guidelines'); }
window.addEventListener('hashchange', route);

// Search narrows the sidebar only; the main panel keeps showing the current
// template until something is picked.
q.addEventListener('input', function () {
  var term = q.value.trim().toLowerCase();
  document.querySelectorAll('details.navgrp').forEach(function (d) {
    var any = false;
    d.querySelectorAll('.navlink').forEach(function (a) {
      var ok = !term || a.dataset.name.indexOf(term) !== -1;
      a.classList.toggle('hide', !ok);
      if (ok) any = true;
    });
    d.classList.toggle('hide', !any);
    if (term) d.open = any;
  });
});

// Enter jumps to the first match; arrows page through; "/" focuses search.
q.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter') return;
  var first = document.querySelector('.navgrp:not(.hide) .navlink:not(.hide)');
  if (first) location.hash = first.getAttribute('href');
});
document.addEventListener('keydown', function (e) {
  if (e.target === q) return;
  if (e.key === '/') { e.preventDefault(); q.focus(); q.select(); return; }
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  var sel = e.key === 'ArrowRight' ? '.pagenav a.nx' : '.pagenav a:not(.nx)';
  var link = document.querySelector('section.tpl.active ' + sel);
  if (link) location.hash = link.getAttribute('href');
});

route();
`;
}

const out = path.join(__dirname, '..', 'DealerCore-Reviewed-Copy.html');
fs.writeFileSync(out, html);
console.log('templates:', model.length, JSON.stringify(counts));
console.log('groups   :', SECTIONS.map((g) => g + '=' + model.filter((m) => sectionOf(m) === g).length).join(' '));
console.log('with notes:', model.filter((m) => m.notes.length).length);
console.log('size     :', (Buffer.byteLength(html) / 1024 / 1024).toFixed(2), 'MB');
