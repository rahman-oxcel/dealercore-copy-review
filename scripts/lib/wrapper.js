// The DealerCore email shell, rebuilt in HTML from the supplied screenshot.
// Two variants, matching the two signature categories already in the workbook:
//   Category 2 - DealerCore speaks to the user: DealerCore branding + system disclaimer
//   Category 1 - the dealership speaks to a customer: dealership branding leads,
//                "on behalf of" disclaimer, small "Powered by DealerCore" footer
//
// NOTE: reconstructed from an image, not from the production Blade layout.
// If the real layout file surfaces, it should replace this.

const { lockup } = require('./logo.js');
const { row: socialRow } = require('./social.js');

const { mark: dealerMark, HAS_LOGO } = require('./dealership.js');

const SIGN_OFF = 'Regards';

// Signatures drop the sending user's job title (the dealership name on that same
// line stays) and the dealership logo, which belongs in the header only. The
// DealerCore block is normalised to "Team DealerCore" with no support address:
// the amber note already carries the contact details.
function cleanSignature(lines) {
  return (lines || [])
    .map((l) => String(l).replace(/^\[User[’']s Role\]\s*[·|,-]?\s*/i, '').trim())
    .map((l) => (/^the dealercore team$/i.test(l) ? 'Team DealerCore' : l))
    .filter((l) => l &&
      !/^\[User[’']s Role\]$/i.test(l) &&
      !/^\[Dealership Logo\]$/i.test(l) &&
      !/^support@dealercore\.com\.au$/i.test(l));
}

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const DISCLAIMER = {
  category2:
    'This is a system-generated email from DealerCore Pty Ltd (ABN 26 696 593 969). ' +
    'Notification preferences and email settings can be updated within your dealership settings. ' +
    'This email and any attachments may contain confidential information intended only for the ' +
    'recipient. If you received this message in error, please delete it immediately.',
  category1:
    'This email was sent on behalf of [Dealership Name] ([Dealership’s ABN]) using DealerCore. ' +
    'DealerCore Pty Ltd (ABN 26 696 593 969) provides the technology platform used to deliver this ' +
    'message. If you were not expecting this email, please contact the dealership directly.',
};


// A line that reads as a "Label: value" pair becomes a detail row, matching the
// bordered table in the reference design.
const asDetailRow = (line) => {
  const m = String(line).match(/^([A-Z][A-Za-z /()'-]{2,34}?)\s*:\s*(.+)$/);
  if (!m) return null;
  if (/^(subject|hi|hello|dear)$/i.test(m[1].trim())) return null;
  return { label: m[1].trim(), value: m[2].trim() };
};

// Some tabs put the label and its value on consecutive rows ("Mobile:" then
// "[Mobile Number]") rather than on one line. Both forms are the same detail row.
const splitRow = (lines, i) => {
  const label = String(lines[i] || '').trim();
  const next = String(lines[i + 1] || '').trim();
  if (!/:$/.test(label) || label.length > 46) return null;
  if (!next || /:$/.test(next)) return null;
  return { label: label.replace(/:$/, ''), value: next };
};

function renderBody(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const run = [];
    while (i < lines.length) {
      const same = asDetailRow(lines[i]);
      if (same) { run.push(same); i++; continue; }
      const split = splitRow(lines, i);
      if (split) { run.push(split); i += 2; continue; }
      break;
    }
    if (run.length >= 2) {
      // Borderless rows separated by hairlines: uppercase label left, value
      // bold and right-aligned, per the reference design.
      out.push(
        '<table class="dc-details"><tbody>' +
          run.map((r) =>
            '<tr><td class="dc-dt-l">' + esc(r.label) + '</td>' +
            '<td class="dc-dt-v">' + esc(r.value) + '</td></tr>').join('') +
        '</tbody></table>'
      );
      continue;
    }
    if (run.length === 1) { out.push('<p class="dc-p">' + esc(lines[i - 1]) + '</p>'); continue; }

    const line = lines[i];
    if (/^[•·▪‣●*-]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[•·▪‣●*-]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[•·▪‣●*-]\s+/, '').trim()); i++;
      }
      out.push('<ul class="dc-ul">' + items.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul>');
      continue;
    }
    out.push('<p class="dc-p">' + esc(line) + '</p>');
    i++;
  }
  return out.join('');
}

function renderEmail({ sigCategory, subject, body = [], signature = [], cta }) {
  const isCat1 = /1/.test(String(sigCategory));

  // Customer-facing mail leads with the dealership's own brand; DealerCore
  // appears only as the platform, in the footer.
  // The logo carries the dealership's identity on its own, so the name is shown
  // only when no logo has been set up.
  const brand = isCat1
    ? (HAS_LOGO ? dealerMark() : '<span class="dc-brandname">[Dealership Name]</span>')
    : lockup();


  return (
    '<div class="dc-stage">' +
      '<div class="dc-card">' +
        '<div class="dc-head">' + brand + '</div>' +
        (subject ? '<h1 class="dc-h1">' + esc(subject) + '</h1>' : '') +
        '<div class="dc-body">' + renderBody(body) + '</div>' +
        (cta
          ? '<div class="dc-cta-wrap"><span class="dc-cta">' + esc(cta) + '</span>' +
              '<span class="dc-cta-note">Link expires in 30 days</span></div>'
          : '') +
        // Amber assistance note, DealerCore mail only. A dealership signature
        // already carries the sending user's email and mobile, so repeating them
        // here would print the same contact details twice in one email.
        (isCat1 ? '' :
          '<div class="dc-note"><span class="dc-note-i">?</span><p>' +
            'Questions or need assistance accessing your dashboard? Feel free to contact us at ' +
            '0405 002 200 / support@dealercore.com.au' +
          '</p></div>') +
        (cleanSignature(signature).length
          ? '<div class="dc-sig"><div class="dc-sig-off">' + SIGN_OFF + '</div>' +
              cleanSignature(signature).map((l) => '<div>' + esc(l) + '</div>').join('') +
            '</div>'
          : '') +
        '<div class="dc-foot">' +
          // Customer-facing mail leads with the dealership's brand, so DealerCore
          // appears only as the platform, in small type at the foot.
          (isCat1 ? '<div class="dc-powered">Powered by ' + lockup('dc-mark-sm') + '</div>' : '') +
          '<span class="dc-foot-links">' +
            (isCat1 ? '' : '<a>Help Centre</a>') +
            '<a>Privacy Policy</a><a>Terms</a>' +
          '</span>' +
          socialRow() +
          '<p class="dc-disclaimer">' + esc(isCat1 ? DISCLAIMER.category1 : DISCLAIMER.category2) + '</p>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

// "Category 1/2" is sheet jargon. These are the names shown on the page.
const SIG_NAME = { '1': 'Dealership', '2': 'DealerCore' };
const sigName = (cat) => SIG_NAME[String(cat).match(/[12]/) ? String(cat).match(/[12]/)[0] : ''] || 'Dealership';

module.exports = { renderEmail, DISCLAIMER, cleanSignature, sigName, SIGN_OFF };
