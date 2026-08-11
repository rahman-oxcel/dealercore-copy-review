// Assemble the deliverable: for every template, what goes out today next to what
// replaces it, plus SMS and push. One self-contained file, no dependencies.
const fs = require('fs');
const path = require('path');

const { renderEmail, cleanSignature, sigName, DISCLAIMER } = require('./lib/wrapper.js');
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

const oldById = new Map(olds.map((o) => [o.id, o]));
const joinByTab = new Map(joinRows.map((r) => [r.tab, r]));
const qaById = qa.reduce((a, f) => ((a[f.id] = a[f.id] || []).push(f), a), {});

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');
const slug = (s) => 't-' + String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Blade asset helpers resolve at render time, so in a static preview they would
// show as broken images. Swap them for a neutral placeholder instead.
function previewDoc(blade) {
  const body = blade
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

// Recipient is a more useful grouping than the sheet's loose categories, whose
// "Others" bucket is a catch-all.
const GROUPS = ['Customer', 'Dealer', 'Staff', 'System'];
const groupOf = (m) => (GROUPS.includes(m.n.channels.recipient) ? m.n.channels.recipient : 'System');

const model = news.map((n) => {
  const j = joinByTab.get(n.tab) || { status: 'NEW' };
  const o = j.oldId ? oldById.get(j.oldId) : null;
  const status = n.redundant ? 'REDUNDANT' : !o ? 'NEW' : 'REVISED';

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

  return { n, o, join: j, status, notes: [...new Set(notes)] };
});

// Reading order follows the sidebar grouping, so the numbers run 1..100 straight
// down the nav, the "N of 100" counter agrees with them, and prev/next walks the
// list in the order it is displayed. Sort is stable, so order within a group is
// the sheet's own.
model.sort((a, b) => GROUPS.indexOf(groupOf(a)) - GROUPS.indexOf(groupOf(b)));

// The page goes straight to the dev team as an instruction, so these state the
// decision without arguing for it.
function smsPanel(m) {
  if (!m.n.sms.length) return '<p class="ruled">Not required for this template.</p>';
  return '<div class="bubble">' + esc(m.n.sms.join(' ')) + '</div>' +
    '<div class="to">To ' + esc(m.n.channels.recipient || '—') + '</div>';
}

function pushPanel(m) {
  if (!m.n.channels.push) return '<p class="ruled">Not required for this template.</p>';
  return '<div class="push"><span class="tx">' +
      '<span class="ti">' + esc(m.n.subject || m.n.tab) + '</span>' +
      '<span class="bd">' + esc(m.n.sms.join(' ')) + '</span>' +
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

function section(m, i, order) {
  const id = slug(m.n.tab);
  const c = m.n.channels;

  const oldPane = '<div class="pane old"><div class="pane-h">Old (as sent today)</div>' +
    (m.o
      ? '<iframe sandbox srcdoc="' + attr(previewDoc(m.o.blade)) + '"></iframe>'
      : '<p class="none">No existing template. This one is new.</p>') +
    '</div>';

  // The old side only ever has an email, so the channel tabs belong to the new
  // panel rather than to the whole template.
  const emailPanel = m.n.body.length
    ? renderEmail({
        sigCategory: m.n.sigCategory,
        subject: m.n.subject,
        body: m.n.body,
        signature: m.n.signature,
        cta: /\b(review|accept|view|confirm|complete|sign|pay|update|book)\b/i.test(m.n.subject || '') ? 'Open in DealerCore' : '',
      })
    : '<p class="none">Marked redundant' + (m.n.redundantTo ? ' to “' + esc(m.n.redundantTo) + '”' : '') + '.</p>';

  const newPane = '<div class="pane new">' +
    '<div class="pane-h"><span>New</span>' +
      // A channel that isn't used keeps its tab but is struck through, so the
      // full channel set stays legible at a glance.
      '<span class="tabs">' +
        '<button class="tab on" data-p="email">' + icon('email') + '<span>Email</span></button>' +
        '<button class="tab' + (m.n.sms.length ? '' : ' empty') + '" data-p="sms">' + icon('sms') + '<span>SMS</span></button>' +
        '<button class="tab' + (m.n.channels.push ? '' : ' empty') + '" data-p="push">' + icon('push') + '<span>Push</span></button>' +
      '</span>' +
    '</div>' +
    '<div class="panel" data-p="email">' + emailPanel + '</div>' +
    '<div class="panel hide" data-p="sms"><div class="chan">' + smsPanel(m) + '</div></div>' +
    '<div class="panel hide" data-p="push"><div class="chan">' + pushPanel(m) + '</div></div>' +
    '</div>';

  const meta = '<div class="meta">' +
    (m.o ? '<span><b>File</b> <code>' + esc(m.o.filePath) + '</code></span>' : '<span><b>File</b> to be created</span>') +
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
    '" data-name="' + attr(m.n.tab.toLowerCase()) + '">' +
    '<div class="crumb">' + esc(groupOf(m)) + '<span>' + i + ' of ' + (order.length - 1) + '</span></div>' +
    // Nearly every template was revised, so that chip says nothing. Only the
    // exceptions are worth flagging.
    '<div class="tpl-head"><h2>' + esc(m.n.tab) + '</h2>' +
      (m.status === 'NEW' || m.status === 'REDUNDANT'
        ? '<span class="chip ' + m.status + '">' + m.status + '</span>' : '') +
      (m.join.status === 'RENAMED' ? '<span class="chip soft">was “' + esc(m.join.oldTitle) + '”</span>' : '') +
      '</div>' +
    meta +
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
      '<div class="g-sig">' +
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
    pager(0, order) +
  '</section>';
}

// ---------- page ----------

const counts = model.reduce((a, m) => ((a[m.status] = (a[m.status] || 0) + 1), a), {});

// Reading order for the pager: guidelines first, then every template.
const order = [{ id: 'guidelines', label: 'Guidelines' }]
  .concat(model.map((m, i) => ({ id: slug(m.n.tab), label: m.n.tab, num: i + 1 })));

// Collapsible groups keep 100 entries from filling the sidebar at once.
// Sidebar numbers are the reading-order position, so they match the "N of 100"
// counter above each template rather than counting within the group.
const positionOf = new Map(model.map((m, i) => [m, i + 1]));

const nav = GROUPS.map((g) => {
  const items = model.filter((m) => groupOf(m) === g);
  if (!items.length) return '';
  return '<details class="navgrp"><summary>' + g + '<span>' + items.length + '</span></summary>' +
    items.map((m) => '<a class="navlink" href="#' + slug(m.n.tab) + '" data-status="' + m.status +
      '" data-name="' + attr(m.n.tab.toLowerCase()) + '">' +
      '<span class="n">' + positionOf.get(m) + '</span>' +
      '<span class="nm">' + esc(m.n.tab) + '</span>' +
      (m.status === 'NEW' || m.status === 'REDUNDANT' ? '<span class="dot ' + m.status + '"></span>' : '') +
      '</a>').join('') +
    '</details>';
}).join('');

const html = '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>DealerCore — Email, SMS &amp; Push Copy</title><style>' + CSS + '</style></head><body>' +
  LOGO_DEFS + SOCIAL_DEFS + DEALER_DEFS + ICON_DEFS +
  '<div class="layout"><aside class="side">' +
    '<div class="side-title">' + lockup('dc-mark-side') + '</div>' +
    '<input class="search" id="q" type="search" placeholder="Search templates…" autocomplete="off">' +
    '<a class="navlink navtop" href="#guidelines" data-name="guidelines">Guidelines</a>' +
    nav +
  '</aside><main class="main">' +
    '<div class="pagehead"><h1>Email, SMS &amp; push copy</h1>' +
      '<p class="kbd">Use <b>←</b> <b>→</b> to move between templates, <b>/</b> to search.</p></div>' +
    guidelines(order) +
    model.map((m, i) => section(m, i + 1, order)).join('') +
  '</main></div><script>' + CLIENT() + '</script></body></html>';

function CLIENT() {
  return `
var q = document.getElementById('q');
var main = document.querySelector('.main');
main.setAttribute('tabindex', '-1');

// Clicking inside the old-preview iframe moves focus into it, and key events
// then go to that document instead of this one, which killed the arrow keys.
// Hand focus back as soon as the iframe takes it.
window.addEventListener('blur', function () {
  setTimeout(function () {
    var a = document.activeElement;
    if (a && a.tagName === 'IFRAME') { a.blur(); main.focus({ preventScroll: true }); }
  }, 0);
});

// One template on screen at a time. 100 sections in a single scroll is not
// navigable, so the hash selects which one is shown.
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
