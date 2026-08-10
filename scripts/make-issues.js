// One tracking issue per template: a three-stage sign-off task list and a
// single comment thread. Writes data/issues.json mapping tab -> issue URL so
// the page can link each template to its tracker.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = 'rahman-oxcel/dealercore-copy-review';
const PAGE = 'https://rahman-oxcel.github.io/dealercore-copy-review/';

const { templates } = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'new_templates.json'), 'utf8')
);
const { rows } = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'join_map.json'), 'utf8')
);
const joinByTab = new Map(rows.map((r) => [r.tab, r]));

const slug = (s) => 't-' + String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const outFile = path.join(__dirname, '..', 'data', 'issues.json');
const done = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};

const gh = (args, input) =>
  execFileSync('gh', args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();

let created = 0;
for (const t of templates) {
  if (done[t.tab]) continue; // resumable: rerun skips existing issues

  const j = joinByTab.get(t.tab) || {};
  const status = t.redundant ? 'REDUNDANT' : !j.oldId ? 'NEW' : 'REVISED';
  const recipient = (t.channels.recipient || 'System').toLowerCase();

  const labels = [recipient];
  if (status === 'NEW') labels.push('new-template');
  if (status === 'REDUNDANT') labels.push('redundant');

  const channels = ['email', t.channels.sms && 'SMS', t.channels.push && 'push']
    .filter(Boolean).join(' · ');

  const body = [
    '**Copy:** ' + PAGE + '#' + slug(t.tab),
    j.filePath ? '**File:** `' + j.filePath + '`' : '**File:** to be created',
    '**Channels:** ' + channels + ' — to ' + (t.channels.recipient || '—'),
    '',
    '### Sign-off',
    '- [ ] Done by dev team',
    '- [ ] Checked by PM',
    '- [ ] Checked by AU team',
    '',
    '_Discussion for this template goes in the comments below._',
  ].join('\n');

  const url = gh(['issue', 'create', '--repo', REPO,
    '--title', t.tab,
    '--label', labels.join(','),
    '--body-file', '-'], body);

  done[t.tab] = url;
  created++;
  fs.writeFileSync(outFile, JSON.stringify(done, null, 2)); // persist as we go
  process.stdout.write('\r' + created + ' created  (' + t.tab + ')          ');

  // Content-creation endpoints trip secondary rate limits when hammered.
  execFileSync(process.platform === 'win32' ? 'powershell' : 'sleep',
    process.platform === 'win32' ? ['-Command', 'Start-Sleep -Milliseconds 900'] : ['0.9']);
}

console.log('\nissues total:', Object.keys(done).length, 'of', templates.length);
