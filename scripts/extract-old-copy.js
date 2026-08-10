// Reduce each Blade template to the human copy a reviewer actually cares about,
// keeping {{ $variables }} visible as placeholders and discarding markup/styling.
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'old_raw.json'), 'utf8'));

const BLOCK = 'p,h1,h2,h3,h4,h5,h6,li,td,th,a,div,span,strong,b,em';

const clean = (s) =>
  String(s)
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Blade control flow isn't copy, but its presence matters to the dev team.
function stripDirectives(blade) {
  const conditional = /@(if|elseif|else|endif|isset|empty|foreach|forelse|endforeach|endforelse)\b/.test(blade);
  const text = blade
    .replace(/\{\{--[\s\S]*?--\}\}/g, '')            // blade comments
    .replace(/@(php)[\s\S]*?@endphp/g, '')
    .replace(/^[ \t]*@[a-zA-Z]+\s*\([^)]*\)[ \t]*$/gm, '') // directive-only lines
    .replace(/^[ \t]*@[a-zA-Z]+[ \t]*$/gm, '');
  return { text, conditional };
}

function extractCopy(blade) {
  const { text, conditional } = stripDirectives(blade);
  const hasMarkup = /<[a-z!][\s\S]*?>/i.test(text);

  if (!hasMarkup) {
    const blocks = text
      .split(/\r?\n/)
      .map(clean)
      .filter(Boolean)
      .map((t) => ({ type: 'p', text: t }));
    return { blocks, conditional, hasMarkup };
  }

  const $ = cheerio.load(text, null, false);
  $('style,script,head,meta,title,img,br,hr').remove();

  const blocks = [];
  const seen = new Set();

  $('*').each((_, el) => {
    const tag = el.tagName && el.tagName.toLowerCase();
    if (!tag || !BLOCK.split(',').includes(tag)) return;

    const $el = $(el);
    // Only take elements whose own text isn't already covered by a descendant,
    // otherwise wrappers duplicate every child's copy.
    const ownText = clean($el.clone().children().remove().end().text());
    const childText = clean($el.children().text());
    let value = ownText;
    if (!value) return;
    if (childText && ownText === childText) return;

    const k = tag + '|' + value;
    if (seen.has(k)) return;
    seen.add(k);

    let type = 'p';
    if (/^h[1-6]$/.test(tag)) type = 'heading';
    else if (tag === 'li') type = 'li';
    else if (tag === 'a') type = 'link';
    else if (tag === 'td' || tag === 'th') type = 'cell';

    const entry = { type, text: value };
    if (tag === 'a') {
      const href = $el.attr('href');
      if (href) entry.href = clean(href);
    }
    blocks.push(entry);
  });

  return { blocks, conditional, hasMarkup };
}

// The subject line is not a field anywhere; it's the first heading in the body.
function guessSubject(blocks) {
  const h = blocks.find((b) => b.type === 'heading' && b.text.length > 3);
  return h ? h.text : '';
}

// {{-- ... --}} is a Blade comment, not a variable, so drop comments first.
const VAR_RE = /\{\{[^}]*\}\}|\{!![^}]*!!\}/g;

const out = raw.map((t) => {
  const { blocks, conditional, hasMarkup } = extractCopy(t.blade);
  const copyText = blocks.map((b) => b.text).join('\n');
  const vars = [
    ...new Set(
      (t.blade.replace(/\{\{--[\s\S]*?--\}\}/g, '').match(VAR_RE) || []).map(clean)
    ),
  ];
  return {
    id: t.id,
    title: t.title,
    category: t.category,
    filePath: t.filePath,
    trigger: t.trigger,
    subject: guessSubject(blocks),
    blocks,
    copyText,
    variables: vars,
    conditional,
    hasMarkup,
    blade: t.blade,
  };
});

fs.writeFileSync(path.join(__dirname, '..', 'old_templates.json'), JSON.stringify(out, null, 2));

console.log('templates:', out.length);
console.log('no copy extracted :', out.filter((t) => !t.blocks.length).map((t) => t.id).join(', ') || 'none');
console.log('no subject guessed:', out.filter((t) => !t.subject).length);
console.log('with conditionals :', out.filter((t) => t.conditional).length);
const bl = out.map((t) => t.blocks.length).sort((a, b) => a - b);
console.log('blocks min/median/max:', bl[0], bl[Math.floor(bl.length / 2)], bl[bl.length - 1]);

console.log('\n--- sample: consignment_sold ---');
const s = out.find((t) => t.id === 'consignment_sold');
s.blocks.forEach((b) => console.log('  [' + b.type + '] ' + b.text.slice(0, 110)));
console.log('  vars:', s.variables.join(' | ') || 'none');
