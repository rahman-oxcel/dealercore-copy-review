// Assemble the deliverable: for every template, what goes out today next to what
// replaces it, plus SMS and push. One self-contained file, no dependencies.
const fs = require('fs');
const path = require('path');

const { renderEmail } = require('./lib/wrapper.js');
const { templateNotes } = require('./lib/why.js');
const { defs: LOGO_DEFS, lockup } = require('./lib/logo.js');
const CSS = require('./lib/styles.js');

const R = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'));
const olds = R('old_templates.json');
const { templates: news } = R('new_templates.json');
const { rows: joinRows } = R('join_map.json');
const qa = R('qa_old.json');

const oldById = new Map(olds.map((o) => [o.id, o]));
const joinByTab = new Map(joinRows.map((r) => [r.tab, r]));
const qaById = qa.reduce((a, f) => ((a[f.id] = a[f.id] || []).push(f), a), {});

// tab -> GitHub issue URL, written by make-issues.js. Absent locally -> no links.
const issuesFile = path.join(__dirname, '..', 'data', 'issues.json');
const issueByTab = fs.existsSync(issuesFile) ? JSON.parse(fs.readFileSync(issuesFile, 'utf8')) : {};

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
  return '<!doctype html><meta charset="utf-8">' +
    '<style>body{font:14px/1.6 Inter,system-ui,sans-serif;margin:0;padding:16px;color:#2c3a45;background:#fff}' +
    'img{max-width:100%}table{max-width:100%}</style>' + body;
}

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
        ') — now replaced by the standard DealerCore disclaimer.');
    }
  });

  return { n, o, join: j, status, notes: [...new Set(notes)] };
});

// Recipient is a more useful grouping than the sheet's loose categories, whose
// "Others" bucket is a catch-all.
const GROUPS = ['Customer', 'Dealer', 'Staff', 'System'];
const groupOf = (m) => (GROUPS.includes(m.n.channels.recipient) ? m.n.channels.recipient : 'System');

function channelChips(c) {
  const one = (k, on) => '<span class="ch ' + (on ? 'on' : 'off') + '">' + k + '</span>';
  return one('Email', c.email) + one('SMS', c.sms) + one('Push', c.push) + (c.internal ? one('Internal', true) : '');
}

function smsBox(m) {
  if (m.n.sms.length) {
    return '<div class="box"><h3>SMS</h3>' +
      '<div class="bubble">' + esc(m.n.sms.join(' ')) + '</div>' +
      '<div class="to">To ' + esc(m.n.channels.recipient || '—') + '</div></div>';
  }
  return '<div class="box"><h3>SMS</h3><p class="ruled">' +
    (m.n.smsNote
      ? '<b>Not recommended.</b> ' + esc(m.n.smsNote.replace(/^Not recommended\s*[—-]\s*/i, ''))
      : 'Email only.') + '</p></div>';
}

function pushBox(m) {
  if (!m.n.channels.push) {
    return '<div class="box"><h3>Push</h3><p class="ruled">Not enabled for this template.</p></div>';
  }
  return '<div class="box"><h3>Push</h3>' +
    '<div class="push"><span class="tx">' +
      '<span class="ti">' + esc(m.n.subject || m.n.tab) + '</span>' +
      '<span class="bd">' + esc(m.n.sms.join(' ')) + '</span>' +
    '</span></div>' +
    '<div class="to">To ' + esc(m.n.channels.recipient || '—') + '</div></div>';
}

function section(m) {
  const id = slug(m.n.tab);
  const c = m.n.channels;

  const oldPane = '<div class="pane"><div class="pane-h">Old — as sent today</div>' +
    (m.o
      ? '<iframe sandbox srcdoc="' + attr(previewDoc(m.o.blade)) + '"></iframe>'
      : '<p class="none">No existing template — this one is new.</p>') +
    '</div>';

  const newPane = '<div class="pane"><div class="pane-h">New — ' + esc(m.n.sigCategory || 'Category 1') + '</div>' +
    (m.n.body.length
      ? '<div class="scroll">' + renderEmail({
          sigCategory: m.n.sigCategory,
          subject: m.n.subject,
          body: m.n.body,
          signature: m.n.signature,
          cta: /\b(review|accept|view|confirm|complete|sign|pay|update|book)\b/i.test(m.n.subject || '') ? 'Open in DealerCore' : '',
        }) + '</div>'
      : '<p class="none">Marked redundant' + (m.n.redundantTo ? ' to “' + esc(m.n.redundantTo) + '”' : '') + '.</p>') +
    '</div>';

  const meta = '<div class="meta">' +
    (m.o ? '<span><b>File</b> <code>' + esc(m.o.filePath) + '</code></span>' : '<span><b>File</b> to be created</span>') +
    '<span><b>Trigger</b> ' + esc(m.n.trigger || '—') + '</span>' +
    '<span><b>To</b> ' + esc(c.recipient || '—') + '</span>' +
    '<span>' + channelChips(c) + '</span>' +
    '</div>';

  const why = m.notes.length
    ? '<div class="box why"><h3>What changed</h3><ul>' +
        m.notes.map((w) => '<li>' + esc(w) + '</li>').join('') + '</ul></div>'
    : '';

  return '<section class="tpl" id="' + id + '" data-status="' + m.status +
    '" data-name="' + attr(m.n.tab.toLowerCase()) + '">' +
    '<div class="tpl-head"><h2>' + esc(m.n.tab) + '</h2>' +
      '<span class="chip ' + m.status + '">' + m.status + '</span>' +
      (m.join.status === 'RENAMED' ? '<span class="chip soft">was “' + esc(m.join.oldTitle) + '”</span>' : '') +
      (issueByTab[m.n.tab]
        ? '<a class="track" href="' + attr(issueByTab[m.n.tab]) + '" target="_blank" rel="noopener">Track ↗</a>'
        : '') +
      '</div>' +
    meta +
    '<div class="cols">' +
      '<div>' + oldPane + '</div>' +
      '<div class="newcol">' + newPane + why + smsBox(m) + pushBox(m) + '</div>' +
    '</div></section>';
}

// ---------- page ----------

const counts = model.reduce((a, m) => ((a[m.status] = (a[m.status] || 0) + 1), a), {});

// Collapsible groups keep 100 entries from filling the sidebar at once.
const nav = GROUPS.map((g) => {
  const items = model.filter((m) => groupOf(m) === g);
  if (!items.length) return '';
  return '<details class="navgrp"><summary>' + g + '<span>' + items.length + '</span></summary>' +
    items.map((m) => '<a class="navlink" href="#' + slug(m.n.tab) + '" data-status="' + m.status +
      '" data-name="' + attr(m.n.tab.toLowerCase()) + '">' +
      (m.status === 'NEW' || m.status === 'REDUNDANT' ? '<span class="dot ' + m.status + '"></span>' : '') +
      '<span class="nm">' + esc(m.n.tab) + '</span></a>').join('') +
    '</details>';
}).join('');

const html = '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>DealerCore — Email, SMS &amp; Push Copy</title><style>' + CSS + '</style></head><body>' +
  LOGO_DEFS +
  '<div class="layout"><aside class="side">' +
    '<div class="side-title">' + lockup('dc-mark-side') + '</div>' +
    '<input class="search" id="q" placeholder="Filter…" autocomplete="off">' +
    '<div class="filters">' +
      ['ALL', 'NEW', 'REVISED', 'REDUNDANT'].map((f) =>
        '<button class="filt' + (f === 'ALL' ? ' on' : '') + '" data-f="' + f + '">' + f + '</button>').join('') +
    '</div>' + nav +
  '</aside><main class="main">' +
    '<div class="pagehead"><h1>Email, SMS &amp; push copy</h1>' +
    '<div class="stats">' +
      '<div><b>' + model.length + '</b>templates</div>' +
      '<div><b>' + (counts.REVISED || 0) + '</b>revised</div>' +
      '<div><b>' + (counts.NEW || 0) + '</b>new</div>' +
      '<div><b>' + model.filter((m) => m.n.sms.length).length + '</b>with SMS</div>' +
      '<div><b>' + model.filter((m) => m.n.channels.push).length + '</b>with push</div>' +
    '</div>' +
    (Object.keys(issueByTab).length
      ? '<p class="boardlink">Sign-off is tracked per template on GitHub — Dev → PM → AU, with one comment thread each. ' +
        '<a href="https://github.com/rahman-oxcel/dealercore-copy-review/issues" target="_blank" rel="noopener">Open the board ↗</a></p>'
      : '') +
    '</div>' +
    model.map(section).join('') +
  '</main></div><script>' + CLIENT() + '</script></body></html>';

function CLIENT() {
  return `
var q = document.getElementById('q');
q.addEventListener('input', apply);
document.addEventListener('click', function (e) {
  var f = e.target.closest('.filt');
  if (!f) return;
  document.querySelectorAll('.filt').forEach(function (b) { b.classList.toggle('on', b === f); });
  apply();
});
function apply() {
  var term = q.value.trim().toLowerCase();
  var on = document.querySelector('.filt.on');
  var want = on ? on.dataset.f : 'ALL';
  var searching = !!term || want !== 'ALL';
  function vis(el) {
    var okF = want === 'ALL' || el.dataset.status === want;
    var okQ = !term || el.dataset.name.indexOf(term) !== -1;
    el.classList.toggle('hide', !(okF && okQ));
    return okF && okQ;
  }
  document.querySelectorAll('section.tpl').forEach(vis);
  document.querySelectorAll('details.navgrp').forEach(function (d) {
    var any = false;
    d.querySelectorAll('.navlink').forEach(function (a) { if (vis(a)) any = true; });
    d.classList.toggle('hide', !any);
    // Reveal matches without making the reader open each group by hand.
    if (searching) d.open = any;
  });
}
`;
}

const out = path.join(__dirname, '..', 'DealerCore-Reviewed-Copy.html');
fs.writeFileSync(out, html);
console.log('templates:', model.length, JSON.stringify(counts));
console.log('groups   :', GROUPS.map((g) => g + '=' + model.filter((m) => groupOf(m) === g).length).join(' '));
console.log('with notes:', model.filter((m) => m.notes.length).length);
console.log('size     :', (Buffer.byteLength(html) / 1024 / 1024).toFixed(2), 'MB');
