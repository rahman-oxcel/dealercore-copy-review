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
const invChip = (m) => {
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
const GROUPS = ['Customer', 'Dealer', 'Staff', 'System'];
// A consignor is a kind of customer, so they sit in that group rather than
// adding a fifth heading for six templates.
const IN_GROUP = { Consignor: 'Customer', Seller: 'Customer' };
// Nobody in these two groups has a DealerCore account.
const NO_LOGIN = ['Customer', 'Consignor', 'Seller'];
const groupOf = (m) => {
  const r = IN_GROUP[m.n.channels.recipient] || m.n.channels.recipient;
  return GROUPS.includes(r) ? r : 'System';
};

const model = news.map((n) => {
  const j = joinByTab.get(n.tab) || { status: 'NEW' };
  const o = j.oldId ? oldById.get(j.oldId) : null;
  const status = n.isLayout ? 'LAYOUT' : n.redundant ? 'REDUNDANT' : !o ? 'NEW' : 'REVISED';

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
model.sort((a, b) => GROUPS.indexOf(groupOf(a)) - GROUPS.indexOf(groupOf(b)));

// The page goes straight to the dev team as an instruction, so these state the
// decision without arguing for it.
// Messages follow the same shape as the emails: greeting, body, sign-off.
// Ben wrote the SMS as a single run of text, so the greeting is split back out
// and the sign-off added to match the template's signature category.
function smsPanel(m) {
  if (!m.n.sms.length) return '<p class="ruled">Not required for this template.</p>';

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
    '<div class="to">To ' + esc(m.n.channels.recipient || '—') + '</div>';
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
  if (!m.n.channels.push) return '<p class="ruled">Not required for this template.</p>';
  return '<div class="push"><span class="tx">' +
      '<span class="ti">' + esc(m.n.subject || shown(m.n)) + '</span>' +
      '<span class="bd">' + esc(m.n.inApp || inAppBody(m.n)) + '</span>' +
    '</span></div>' +
    '<div class="to">To ' + esc(m.n.channels.recipient || '—') + '</div>';
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
    '<div class="crumb">' + esc(groupOf(m)) + '<span>' + i + ' of ' + (order.length - 1) + '</span></div>' +
    '<div class="tpl-head"><h2>' + esc(shown(m.n)) + '</h2>' +
      '<span class="chip LAYOUT">Layout</span>' + invChip(m) + '</div>' +
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

function section(m, i, order) {
  const id = slug(m.n.tab);
  const c = m.n.channels;

  // No separate subject field: the email renders the subject as its headline,
  // so a labelled field above the preview would show the same text twice.
  // The old side only ever has an email, so the channel tabs belong to the new
  // panel rather than to the whole template.
  const emailPanel = m.n.body.length
    ? renderEmail({
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
      })
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
      : '<p class="none">No existing template. This one is new.</p>') +
    '</div>';

  const newPane = '<div class="pane new">' +
    '<div class="pane-h"><span>Copy</span>' +
      // A channel that isn't used keeps its tab but is struck through, so the
      // full channel set stays legible at a glance.
      '<span class="tabs">' +
        '<button class="tab on" data-p="email">' + icon('email') + '<span>Email</span></button>' +
        '<button class="tab' + (m.n.sms.length ? '' : ' empty') + '" data-p="sms">' + icon('sms') + '<span>SMS</span></button>' +
        '<button class="tab' + (m.n.channels.push ? '' : ' empty') + '" data-p="push">' + icon('push') + '<span>In-app</span></button>' +
      '</span>' +
    '</div>' +
    '<div class="panel" data-p="email">' + emailPanel + '</div>' +
    '<div class="panel hide" data-p="sms"><div class="chan">' + smsPanel(m) + '</div></div>' +
    '<div class="panel hide" data-p="push"><div class="chan">' + inAppPanel(m) + '</div></div>' +
    '</div>';

  const meta = '<div class="meta">' +
    '<span><b>Trigger</b> ' + esc(m.n.trigger || '—') + '</span>' +
    // No channel chips here: the tabs on the New panel already carry that, and
    // showing both meant reading the same fact twice. "Sent as" lives here
    // rather than in the New panel header, where it collided with the tabs.
    '<span><b>To</b> ' + esc(c.recipient || '—') + '</span>' +
    '<span><b>Sent as</b> ' + esc(sigName(m.n.sigCategory)) + '</span>' +
    '</div>';

  const why = m.notes.length
    ? '<div class="box why wide"><h3>What changed</h3><ul>' +
        m.notes.map((w) => '<li>' + esc(w) + '</li>').join('') + '</ul></div>'
    : '';

  return '<section class="tpl" id="' + id + '" data-status="' + m.status +
    '" data-name="' + attr((shown(m.n) + ' ' + m.n.tab).toLowerCase()) + '">' +
    '<div class="crumb">' + esc(groupOf(m)) + '<span>' + i + ' of ' + (order.length - 1) + '</span></div>' +
    // Nearly every template was revised, so that chip says nothing. Only the
    // exceptions are worth flagging.
    '<div class="tpl-head"><h2>' + esc(shown(m.n)) + '</h2>' +
      (m.status === 'NEW' || m.status === 'REDUNDANT'
        ? '<span class="chip ' + m.status + '">' + m.status + '</span>' : '') +
      (m.join.status === 'RENAMED' ? '<span class="chip soft">was “' + esc(m.join.oldTitle) + '”</span>' : '') +
      (m.flagged ? '<span class="chip FLAG">Flagged</span>' : '') +
      (m.hasAttachment ? '<span class="chip ATTACH">' + icon('email') + 'Attachment</span>' : '') +
      invChip(m) +
      '</div>' +
    meta +
    (m.flagNote ? '<div class="flagbar"><b>Open question</b>' + esc(m.flagNote) + '</div>' : '') +
    (m.noteBar ? '<div class="notebar"><b>New addition</b>' + esc(m.noteBar) + '</div>' : '') +
    '<div class="cols"><div>' + oldPane + '</div><div class="newcol">' + newPane + '</div></div>' +
    why +
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
    // The page is the only thing shared, so a chip that asks the reader a
    // question has to say what the question is without anywhere to look it up.
    (Object.keys(inventory).length ? '<div class="box legend"><h3>Against your notification list</h3>' +
      '<p>Every template carries the status your own list gives it, in your wording, with the row it ' +
      'sits on there. Two of the three need an answer from you.</p>' +
      '<p><span class="chip INVOK">Matched &middot; Row 2</span> One entry on your list, one template ' +
      'here. Nothing needed.</p>' +
      '<p><span class="chip PARTIAL">Partially Matched &middot; Row 42</span> That row covers more than ' +
      'one template here, and nothing says which of them fires. The copy for each is written out. Tell ' +
      'us which is live and the rest can go.</p>' +
      '<p><span class="chip NOTLISTED">Only in v0.1 &middot; Row 90</span> This template has copy but ' +
      'your list has no entry for it. Either the list is missing it or nothing sends it any more. Those ' +
      'marked New were written during this review, so their absence is expected.</p>' +
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

const nav = GROUPS.map((g) => {
  const items = model.filter((m) => groupOf(m) === g);
  if (!items.length) return '';
  return '<details class="navgrp"><summary>' + g + '<span>' + items.length + '</span></summary>' +
    items.map((m) => '<a class="navlink" href="#' + slug(m.n.tab) + '" data-status="' + m.status +
      '" data-name="' + attr((shown(m.n) + ' ' + m.n.tab).toLowerCase()) + '">' +
      '<span class="n">' + positionOf.get(m) + '</span>' +
      '<span class="nm">' + esc(shown(m.n)) + '</span>' +
      // The only mark in the sidebar, and it means one thing: this template is
      // settled. Everything else is carried by the chips on the template itself.
      (isDone(m) ? '<span class="dot DONE"></span>' : '') +
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
  var stage = sec.querySelector('.panel[data-p="email"] .dc-stage');
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
console.log('groups   :', GROUPS.map((g) => g + '=' + model.filter((m) => groupOf(m) === g).length).join(' '));
console.log('with notes:', model.filter((m) => m.notes.length).length);
console.log('size     :', (Buffer.byteLength(html) / 1024 / 1024).toFixed(2), 'MB');
