# DealerCore — Copy Review

Reviewed email, SMS and push notification copy for all 100 DealerCore templates,
shown side by side with what each template sends today.

## The page

**https://rahman-oxcel.github.io/dealercore-copy-review/**

The page is AES-256 encrypted ([StatiCrypt](https://github.com/robinmoisson/staticrypt));
ask Rahman for the password. Everything renders offline once decrypted — no
external requests.

## Tracking

Each template has a GitHub issue with the three-stage sign-off:

- [ ] Done by dev team
- [ ] Checked by PM
- [ ] Checked by AU team

Use the **Track ↗** link on any template in the page, or browse the
[issue board](https://github.com/rahman-oxcel/dealercore-copy-review/issues).
Discussion for a template belongs in its issue's comment thread.
Filter by label: `customer` / `dealer` / `staff` / `system`, plus
`new-template` and `redundant`.

## What's in this repo

| Path | What |
|---|---|
| `index.html` | The encrypted deliverable (served by GitHub Pages) |
| `scripts/` | The pipeline that builds it from the source documents |
| `data/overrides.json` | Documented corrections applied on top of the review sheet |

The source documents (the dev team's template documentation and the review
spreadsheet) and all extracted data stay local — this repo is public, so only
the encrypted output ships.

## Rebuilding

Requires the two source files locally, then:

```bash
node scripts/extract-old.js
node scripts/extract-old-copy.js
node scripts/extract-new.js
node scripts/join.js
node scripts/qa-old.js
node scripts/build.js
npx staticrypt DealerCore-Reviewed-Copy.html -d site --template-title "DealerCore Copy Review"
```
