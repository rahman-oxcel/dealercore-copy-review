// The supplied DealerCore logo, inlined once and referenced everywhere.
// At 24 KB, repeating it per template would add ~2 MB to the file.
const fs = require('fs');
const path = require('path');

const raw = fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'dc-logo.svg'), 'utf8');

// Keep only the drawing itself; the outer <svg> sizing is supplied per use.
const inner = raw.replace(/^[\s\S]*?<svg[^>]*>/i, '').replace(/<\/svg>\s*$/i, '').trim();

// The artwork is a 1024x202 lockup: circular emblem occupying roughly the first
// 200 units, then the "DealerCore" wordmark. A narrower viewBox over the same
// artwork crops to just the emblem, which is what square contexts need.
const defs =
  '<svg width="0" height="0" style="position:absolute" aria-hidden="true">' +
    '<defs><g id="dc-art">' + inner + '</g>' +
      '<symbol id="dc-lockup" viewBox="0 0 1024 202"><use href="#dc-art"/></symbol>' +
      '<symbol id="dc-emblem" viewBox="0 0 200 202"><use href="#dc-art"/></symbol>' +
    '</defs>' +
  '</svg>';

const lockup = (cls = 'dc-mark') =>
  '<svg class="' + cls + '" viewBox="0 0 1024 202" role="img" aria-label="DealerCore"><use href="#dc-lockup"/></svg>';

const emblem = (cls = 'dc-em') =>
  '<svg class="' + cls + '" viewBox="0 0 200 202" role="img" aria-label="DealerCore"><use href="#dc-emblem"/></svg>';

module.exports = { defs, lockup, emblem };
