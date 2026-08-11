// Category 1 emails lead with the dealership's own logo. This is a placeholder
// for that slot, but built as a real lockup (mark + wordmark) so the preview
// shows the visual weight an actual logo will occupy.
//
// Royal-to-navy blue: a dealership brand reads as blue, but a deeper one than
// DealerCore's cyan so the two marks never merge into a single identity.

// Defined once. The gradient needs a single id on the page, so the mark is a
// <symbol> referenced per template rather than 51 copies of the same id.
const defs =
  '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
    '<linearGradient id="dl-grad" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#3B82F6"/>' +
      '<stop offset="1" stop-color="#1E3A8A"/>' +
    '</linearGradient>' +
    '<symbol id="dl-mark" viewBox="0 0 40 40">' +
      '<rect width="40" height="40" rx="10" fill="url(#dl-grad)"/>' +
      // Car in side profile: the plainest possible read on "dealership".
      '<path d="M9 24.2v-3c0-.9.5-1.7 1.3-2l1.9-.9 2.5-3.6c.5-.7 1.3-1.1 2.1-1.1h6.4c.8 0 1.6.4 2.1 1.1l2.5 3.6 1.9.9c.8.3 1.3 1.1 1.3 2v3a.9.9 0 0 1-.9.9H9.9a.9.9 0 0 1-.9-.9Z" fill="#fff"/>' +
      '<path d="M16.4 15.4h7.2l2.1 3.1H14.3l2.1-3.1Z" fill="#BFDBFE"/>' +
      '<circle cx="14.8" cy="25.6" r="2.9" fill="#fff"/>' +
      '<circle cx="25.2" cy="25.6" r="2.9" fill="#fff"/>' +
      '<circle cx="14.8" cy="25.6" r="1.2" fill="#1E3A8A"/>' +
      '<circle cx="25.2" cy="25.6" r="1.2" fill="#1E3A8A"/>' +
    '</symbol>' +
  '</defs></svg>';

const mark = () =>
  '<span class="dl-ph">' +
    '<svg class="dl-mk" viewBox="0 0 40 40" aria-hidden="true"><use href="#dl-mark"/></svg>' +
    '<span class="dl-tx"><b>Dealership</b><i>Logo</i></span>' +
  '</span>';

// A dealership that has uploaded a logo shows it alone; one that has not falls
// back to its name as text. Previews assume a logo is set.
const HAS_LOGO = true;

module.exports = { defs, mark, HAS_LOGO };
