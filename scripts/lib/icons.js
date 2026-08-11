// Channel icons for the Email / SMS / Push / Internal chips. Same approach as
// the logos: declared once, referenced per use, since every template repeats them.

const PATHS = {
  email: 'M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm-.6 2L12 11.3 4.6 6h14.8ZM4 18V7.6l8 5.6 8-5.6V18H4Z',
  sms: 'M20 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2v4l4.8-4H20a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z',
  push: 'M12 22a2.2 2.2 0 0 0 2.2-2.2H9.8A2.2 2.2 0 0 0 12 22Zm7.2-5.5V11a7.2 7.2 0 0 0-5.5-7v-.7a1.7 1.7 0 0 0-3.4 0V4A7.2 7.2 0 0 0 4.8 11v5.5L2.8 18.5v.9h18.4v-.9l-2-2Z',
  internal: 'M17 9V7A5 5 0 0 0 7 7v2H5.2v12h13.6V9H17ZM9 7a3 3 0 0 1 6 0v2H9V7Zm4 9.7V19h-2v-2.3a2 2 0 1 1 2 0Z',
};

const ORDER = ['email', 'sms', 'push', 'internal'];

const defs =
  '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
    ORDER.map((k) =>
      '<symbol id="ic-' + k + '" viewBox="0 0 24 24"><path d="' + PATHS[k] + '"/></symbol>').join('') +
  '</defs></svg>';

const icon = (name) =>
  '<svg class="ci" viewBox="0 0 24 24" aria-hidden="true"><use href="#ic-' + name + '"/></svg>';

module.exports = { defs, icon };
