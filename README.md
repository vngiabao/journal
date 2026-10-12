# Project Reboot

A React + TypeScript application built from the May 2026 Project Reboot board. The current design uses cool letter paper, Prussian blue, Cormorant Garamond, Source Sans 3, Courier Prime, and Phosphor icons, with original scene illustrations and the approved Bao companion artwork.

Source repository: [vngiabao/journal](https://github.com/vngiabao/journal). Production: [journal.gbaonvo.com](https://journal.gbaonvo.com).

## Open the app

The private hosted version is **https://journal.gbaonvo.com**. Sign in as **gbao.n.vo@gmail.com**; Cloudflare Access denies every other email. See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment, security checks and moving existing localhost data with a JSON backup. Entries remain local to each browser and do not sync between devices.

Double-click **Start Project Reboot.cmd**, then open **http://127.0.0.1:5174**. Keep the terminal open while using the app. The fixed address matters: browser data belongs to this origin and browser profile.

Alternatively, run `npm install` once, then `npm run dev`. For a production bundle, run `npm run build`. The local version needs no account. The hosted version uses Cloudflare Access and a verified account endpoint; journal data still stays in the browser, with no analytics or server-side journal storage.

## Start your board

All 36 original commitments are seeded with no activity records. Choose each goal's status on the first-launch board, then finish setup. The volunteer and respectful-language red checks are undated historical indicators, not current completions or invented streaks.

Use the tracker table, original-position classic board, or weekly matrix. Pin goals and set their priority to organize Today. Open a row for records, measurements, stages, original criteria, and history. Changes produce effective-dated versions; a restart creates a new run while retaining earlier records.

## Confidence, from evidence

- **Proof file.** Log a *Win*, a *Shot taken* (anything brave you tried, whatever the outcome; applications and interviews count), or a *Lesson*. Add from Today or the journal; browse and filter in Review. Today resurfaces one earlier entry each day.
- **Promises kept.** Today and Review count successful habit records (daily, weekly-frequency, and logged distance), once per goal per day. Nothing is counted that you did not record.
- **Who you're becoming.** One sentence in your own words at the top of Today.
- **The center of your board.** The four maize goals from the middle of the May board (girlfriend, job, 75 kg, investor/accelerator) stay visible on Today. The Classic board keeps the original ink: blue outer frame, green inner ring, maize center.

## Journal as home base

Today includes a to-do list for today and tomorrow. Writing tomorrow's list counts toward the nightly to-do commitment; unfinished items can be carried forward. Bao's mood responds to recorded promises and Journey moments. Original scene headers and chibi reactions accompany the pages. Runtime artwork lives in `public/art`; editable originals, generation prompts, and earlier variants are preserved in `art-src`.

Focus mode (expand icon, Esc to leave) hides everything but the page. Each daily entry can mark the day on your Journey line, add proof, and, with one explicit click, count toward "Write a journal". Typing is coalesced: one history record and one database write per burst instead of per keystroke.

## Tracking rules

- Daily streaks count actual calendar dates. Yesterday's streak remains at risk until today closes; a confirmed failure resets it immediately. Missing closed days break the streak. Multi-task routines require all tasks, and numeric daily routines require their full quantity.
- Weeks run Monday through Sunday in the selected timezone. Only closed weeks count as qualifying. A quota can still be met after a missed day. A new weekly goal begins counting whole qualifying weeks from its first full Monday; activity in the initial partial week is still saved and shown.
- Weekly upper limits are strict: below 20 hours and fewer than four late-night eating occasions. An explicit zero is valid; an entirely unrecorded week cannot qualify. Enter daily quantities; the application sums them by week.
- Durations in months use actual calendar months. Consecutive-period targets and total qualifying-period targets are editable.
- Weight and waist use actual dated values. Trading return requires an account baseline and dated account values. The board never assumes a current weight or waist measurement.
- Books count only when finished. Instagram connections require both actions. City and new-person counters deduplicate normalized names. YC requires all stages, including submission; investor/program completion requires an explicit final state with an evidence link.
- Goal status has three states: Not started, In streak (In progress for milestones and counters), and Completed. Completed squares on the Classic board get a red ink check like the May board, and a fully completed row, column, or diagonal is struck through like bingo. Older Paused/Archived goals migrate to Not started with their records intact. Goal status is a user-selected lifecycle state. Objective achievement is calculated separately from actual records and preserved in history.

## Journey

The Journey line is one continuous path through every moment you marked. A day can hold several moments ("Add another moment"), each its own dot with its own note; the day's total is the sum. Notes collect in the Journey log below the chart, newest first. Select a date by clicking the chart or a date label, then click vertically to place its endpoint. Drag an existing point to adjust it. Use left/right arrows to select dates and up/down arrows to adjust; Enter records the current endpoint, Escape cancels a drag. A neutral-day button records zero movement explicitly. The line joins the days you marked; days without a mark have no dot. Name a day with a moment tag from the growth illustration (Doubt, Burnout, Small win, Restart, Breakthrough) to label it on the line; the line ends in an arrow at your latest mark. While dragging, a word ("A small step forward", "A hard day") describes the movement relative to the visible scale; there is still no number. Today and the journal include a compact editable line for marking the day in one click.

The stored value is a signed daily movement. Editing an earlier point retains later movements and shifts later cumulative endpoints. The vertical scale stays fixed during dragging. Undo/redo applies to graph edits within the current Journey session. Notes, significant-moment markers, zoom, and period navigation are available. Future dates are excluded. Journey never changes objective habits automatically.

## Journal, reviews, and backups

Journal entries autosave, with optional mood, prompts, linked goals, and local photos (PNG/JPG/WebP, up to 3 MB each). The calendar and searchable timeline support historical entries. Daily journals and weekly/monthly reviews are separate entry types.

Review shows recorded effort, observed-day consistency, closed qualifying weeks, actual measurements, deadlines, and dated achievements. It compares equivalent elapsed windows from the preceding week, month, or year. Trading trajectories display return percentages calculated from each entry's effective account baseline. Unrecorded days stay visible and are excluded from observed-day percentages.

Settings provides validated JSON backup/restore, activity and progress CSV exports, language selection, timezone changes, and confirmed personal-data reset. Restore previews record counts and requires an explicit replace action.

Data stays in IndexedDB for the current browser profile and origin. The hosted website requires Cloudflare Access sign-in; local data is not synced or encrypted. Export backups regularly; clearing browser storage removes local records. The seed registry and supplied reference board remain available after a reset.

## Verification

`npm test` runs the tracking and data-model tests. `node tests/browser.mjs` runs real Edge browser workflow checks against the local server (set `REBOOT_URL` to test another port). `node tests/visual.mjs <outDir> <url>` captures every page at desktop, tablet, and phone widths with clearly labelled SAMPLE data in an isolated profile. The browser test uses isolated profiles and never seeds its activity into your normal browser.

Verified workflows: first launch and activation, partial checklists, daily completion, weekly quotas and strict limits, effective rules, restarts, actual measurements, completed-book counts, distinct cities, investor and YC conditions, Journey mouse/drag/keyboard/touch edits, historical recalculation, undo/redo, refresh persistence, journals, JSON export/validation/restore, and responsive layouts at 1440, 768, and 390 pixels.

Visual QA evidence is generated locally in `.impeccable/review` and excluded from Git. Emil Kowalski, Impeccable, Taste, and Hallmark informed earlier design work; the current design tokens live in `src/tokens.css`. `DESIGN.md` records the evolution and approved artwork direction.
