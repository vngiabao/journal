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
is uploaded to that identity endpoint. Enabled devices sync journal records and photos through the separate `/api/sync` endpoints.

Journal entries, images, goals and progress remain in IndexedDB, scoped to the
browser profile and origin. Authentication alone does not enable synchronization. Enable it in Settings on each device. Local browser storage is not encrypted at the application level. Signing out does not erase local data.

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

## Shared Supabase sync — October 25, 2026

Project `brepokoccawgqtxqxuwg` (Shiori) also serves Kiyo. Applied `supabase/reboot-sync.sql` through the signed-in dashboard; it adds only Reboot tables/RPC and a private bucket. `supabase/verify-reboot-sync.sql` passed in the hosted SQL editor with fixtures rolled back: stale-write rejection, client privilege denial, private bucket, unchanged Shiori/Kiyo record counts. Browser clients cannot access the tables or RPC using anon/authenticated Supabase roles.

The Worker still verifies the exact Cloudflare owner JWT before every sync/photo route. Writes additionally require a same-origin Origin header and `X-Reboot-Sync: 1`. A server-only Supabase key is stored with `wrangler secret put SUPABASE_SECRET_KEY`; it is never a VITE variable. The ignored `.env.sync` is for local operational setup only. `scripts/configure-sync.mjs` pipes the key to Wrangler over stdin without logging it. No secrets enter Git or the built assets.

Client sync remains off until enabled in Settings. The first enable saves `sync-first-backup` in IndexedDB, then uploads or downloads the account. Competing initial device data requires review. Local-first edits merge three ways, including deletion and nested plan/training records; competing values pause with complete recovery copies. Revision compare-and-swap happens in a transaction. The server keeps twenty previous snapshots; photos are immutable, content-addressed, checksum-verified and private. A first backup and last conflict recovery remain on the device. Recovery copies downloaded from Settings are archives containing local/cloud/base states; choose a contained State object when doing a normal JSON restore.

A reset or backup restore while sync is enabled propagates to the cloud. Pause sync before a device-only reset. Cloud snapshots and orphaned photos are retained for recovery; pausing/signing out is not deletion. Limits: 3 MB per photo and 16 MB per serialized metadata upload (photo bodies are externalized, including copies inside audit history). Shared project quotas still apply.

`npm run test:sync` uses isolated browser contexts and a simulated backend, never production journals. It covers initial opt-in, two-device transfers, offline disjoint edits, private photo transport, concurrent journal conflicts, explicit recovery, persistence and mobile layout. `scripts/verify-supabase-sync.mjs` additionally verified the real private photo API and anon table/RPC/storage denial using an inert one-pixel object. No test journal was left in production.

Cloudflare release: `c563d724-e3bf-42eb-81a3-a993f999f2c5`.

Live acceptance: refreshed the existing owner Google session, loaded the new PWA, enabled sync in the owner’s existing Edge profile, and confirmed “Synced across your devices” in Settings. Supabase revision 1 contains the existing 36 goals, 3 activity records, 5 Journey days and 2 to-dos; the current profile had no journal entries. No fake activity was added. The automatic first-device recovery backup stays in IndexedDB. Other devices still need to enable sync after owner sign-in. A physical second device was not available; the two-device/offline/conflict/photo browser test used a simulated backend, while the owner upload, database isolation and private-storage checks used the real services.
