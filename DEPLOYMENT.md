# Private hosted journal

Production: https://journal.gbaonvo.com

Source: https://github.com/vngiabao/journal (`main`). The October 12, 2026
deployment captures the updated Bao companion, original artwork, to-do lists,
new fonts/icons, and per-moment Journey labels. Cloudflare Worker version:
`484d245e-bac2-4d68-b9c7-bd3aa073d83f` (application source commit `9a062f5`).

Cloudflare account: `c171df5a2c42c7c28825bc0d2e64698b`.
Worker: `project-reboot`. Zone: `gbaonvo.com`.

The Cloudflare Access application “Project Reboot — private journal” has ID
`856bbc2d-d734-4984-b696-88dbdde5b37e`. Its only policy is Allow with one
Emails include value: `gbao.n.vo@gmail.com`. Policy ID:
`7117b65e-cf06-4cf8-bfc1-a61501f6cde3`.

The application protects the entire `journal.gbaonvo.com` hostname and the
`project-reboot` Worker's production and preview URLs. All other identities
are denied by default. It uses the existing Zero Trust organization at
`astoryapp.cloudflareaccess.com`, with existing Google and Cloudflare login
methods. The application session lasts 24 hours. HTTP-only and binding cookies
are enabled. Unrelated apps and policies have not been changed.

`wrangler.jsonc` disables workers.dev and preview URLs. Every asset runs through
`worker/index.mjs` first, which verifies the Access JWT signature, issuer,
application audience, expiry and exact owner email before serving anything.
It reads the assertion header or the signed `CF_Authorization` session cookie
when static-asset routing omits the header. The runtime entrypoint keeps
Cloudflare's ExecutionContext separate from the JWT key resolver.
An absent Access configuration blocks all requests. Responses are private and
not cached, and restrict framing, scripts, connections and browser permissions.
Never deploy this application with `run_worker_first` disabled.

## Updating production

Use the existing Wrangler login:

```powershell
npm run deploy
npm run test:access-live
```

Push reviewed source changes with `git push origin main`, then deploy that
checkout with `npm run deploy`. GitHub pushes do not automatically deploy;
no GitHub/Cloudflare build connection or deployment secret has been added.

Access policy changes use the signed-in Cloudflare dashboard. The Wrangler
OAuth credential can deploy Workers but cannot edit Access policies. No extra
API token is required for the completed deployment.

## Data and sign-in

Sign in as `gbao.n.vo@gmail.com`. Settings displays the verified account and a
sign-out link. Account identity is checked by `/api/account`; no journal data
is uploaded to that endpoint or to a server database.

Journal entries, images, goals and progress remain in IndexedDB, scoped to the
browser profile and origin. Authentication is not cross-device synchronization
or encryption of local browser storage. Signing out does not erase local data.

To move existing localhost records, export a Full JSON backup from Settings at
http://127.0.0.1:5174 and restore it from Settings at the production address.
Nothing is migrated automatically or deleted from the original browser.

Only `dist/` assets are uploaded. Test samples, backups, source documentation,
and credentials are outside that directory. Secrets are excluded by `.gitignore`.

## Verification

`npm test` includes real signed-token tests for owner, wrong email, wrong audience,
wrong issuer, expired token, invalid signature, forged headers and missing config.
`npm run test:browser` tests app workflows in an isolated Edge profile on localhost.
`npm run test:access-live` probes production pages, images, fonts, JS, CSS and
account identity anonymously with forged headers; all must redirect to Access.
It also checks every shipped Bao/chibi/scene asset and a bundled font.
Cloudflare's policy tester confirms one existing user approved and two blocked.
Live owner login was verified on October 11, 2026: the production board opens
and Settings confirms `gbao.n.vo@gmail.com` through `/api/account`. A handler
argument bug that rejected authenticated requests was repaired and deployed.
Account Settings rendering and error behavior were tested locally with a mocked
identity endpoint at desktop and mobile widths (`tests/account-browser.mjs`).
