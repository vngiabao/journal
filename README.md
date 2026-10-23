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

Today opens with Today's list, a featured card under the greeting. Above today's list sits one line to start the day, such as a quote; it stays up until you write a new one, and past lines are kept by date. The first item you add each day counts toward the daily to-do commitment; unfinished items can be moved to tomorrow. Bao's mood responds to recorded promises and Journey moments. Original scene headers and chibi reactions accompany the pages. Runtime artwork lives in `public/art`; editable originals, generation prompts, and earlier variants are preserved in `art-src`.

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

Log a Journey moment by picking how it moved you (Big setback, Setback, Steady, Step forward, Big step), adding what happened and an optional label, then Add to my line. Every moment has Edit and Delete, and a deleted moment can be restored with Undo. The chart is drawn like a sketchbook (rough.js pencil lines, hatched shading, a highlighter on today, Caveat handwriting). Today gets most of the width: tap anywhere in today's column to place a moment right there (higher for a good moment, lower for a hard one; left to right is the time of day), drag before letting go to adjust, then add an optional note in the card beside it. Past days only take room when they hold a mark; quiet stretches fold into a small squiggle. Clicking a past day selects it for the form below; dragging a dot or using the arrow keys fine-tunes it. The Journey line is one continuous path through every moment you marked. A day can hold several moments ("Add another moment"), each its own dot with its own note; the day's total is the sum. Notes collect in the Journey log below the chart, newest first. Select a date by clicking the chart or a date label, then click vertically to place its endpoint. Drag an existing point to adjust it. Use left/right arrows to select dates and up/down arrows to adjust; Enter records the current endpoint, Escape cancels a drag. A neutral-day button records zero movement explicitly. The line joins the days you marked; days without a mark have no dot. Name a day with a moment tag from the growth illustration (Doubt, Burnout, Small win, Restart, Breakthrough) to label it on the line; the line ends in an arrow at your latest mark. While dragging, a word ("A small step forward", "A hard day") describes the movement relative to the visible scale; there is still no number. Today and the journal include a compact editable line for marking the day in one click.

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

## Install on iPhone

Project Reboot is an installable web app (no App Store, no Apple Developer account, no Mac needed).

1. Deploy (`npm run deploy`), then open https://journal.gbaonvo.com in **Safari** on the iPhone and sign in.
2. Tap **Share → Add to Home Screen**, keep the name "Reboot", tap **Add**.
3. Open it from the Home Screen. It runs full screen, works offline, and updates itself when a new version is deployed.

The installed app keeps its own data, separate from Safari and from your computer. To bring existing entries over, use **Settings → Full JSON backup** on the computer, send the file to the phone, then **Settings → Restore from a JSON backup** in the installed app. Deleting the Home Screen app deletes its data, so back up first.

## Board and Journal

**Reboot Board.** The board is one printed bingo card with REBOOT across the top:
- Its rings show as paper tints: outer ring easier, middle ring harder, centre four hardest.
- Active squares fill with ink as they progress, and finished ones carry a wax seal.
- Tapping a square opens a drawer with its status, pin and full history: a side panel on a computer, a bottom sheet on a phone.

**Journal.** The journal is a leather-bound book open on a lamp-lit desk at night: an oxblood cover with gold stitching, gilded page edges and a silk ribbon. The left page holds the entry number, date, mood and four questions numbered i to iv, plus the wax seal; the right page is only for writing:
- This week runs across the top: the selected day on a white disc, today ringed in gold, and each written day marked with its mood colour. Tap the month name for a month panel where written days are tinted by mood.
- The page is a single heavy sheet with paper grain and a large date masthead.
- Moods are colour swatches.
- Prompts appear only while the page is empty.
- "Count it" is a wax seal.
- Inside, the pages are printed: double gold frames with corner ornaments, running heads, page numbers, fine ruling for writing, today's morning line as an epigraph, and a blind-embossed Reboot mark.
- Past pages are laid out below as cards, with search.

## Eat That Frog

Habits from Brian Tracy's *Eat That Frog*, built into Today's list (`src/Frog.tsx`, rules in `src/frog-rules.ts`):
- **One frog a day.** Tap the frog on the task you'd most like to put off. It moves into a featured card that says "eat this first". After noon the frog turns nervous; eating it sends it leaping off and celebrates.
- **ABCDE.** Tap the letter chip on any task: A must, B should, C nice to do, D delegate, E eliminate. The list sorts by letter, and ticking a B or C while an A or the frog is still open gets a gentle nudge.
- **Slice it.** Break the frog into small first steps, with a progress bar.
- **Eat it now.** A 25, 50 or 90 minute focus screen with only the frog, its slices and a timer. It notifies you when time is up.
- **Plan tomorrow tonight.** After 5 pm, choose tomorrow's frog. It's one task, not a list, and it becomes the frog at midnight.
- **Record.** The frog count, the streak and the number eaten before noon show on Today.
- **Reminders** (Settings, Frog reminders):
  - A morning "Eat your frog first" and an evening "Choose tomorrow's frog".
  - "Add to my calendar" downloads two daily calendar alarms, which ring on your phone even when Reboot is closed.
  - "Notify me on this device" shows system notifications while Reboot is open. The morning one stays quiet once the frog is eaten.

## Pocket pups and small delights

On a computer, a chibi Shiba and Samoyed live on the bottom edge of the page (`src/Pet.tsx`, art in `public/art/dog/`). You can pick one, both or none in Settings.
- They trot after you, and run over when you tap empty space, leaving paw prints and sniffing the spot.
- They cover their eyes while you write ("Not peeking. Promise.") and peek out when you finish.
- They tilt their heads while you type.
- They jump for a kept promise and stand up for a finished goal.
- Tap one and it reminds you of a real entry from your proof file.
- They lie down when you step away and curl up asleep after a few minutes.

They ignore the pointer, so they never block a click. They are hidden on phones and with Reduce Motion. Swap poses through the `STILL` map in `src/Pet.tsx`.

Elsewhere (`src/delight.ts`):
- Keeping a promise or ticking a to-do stamps "KEPT" in red ink where you pressed.
- Primary buttons lean toward the pointer, and board squares tilt like cards.
- The journal shows a fountain-pen cursor and your Journey line a pencil.
- Hovering the logo redraws it.
- Type "reboot" anywhere outside a text box for a surprise.

## Motion

Animations use GSAP (all plugins are free and ship in the `gsap` package), set up in `src/motion.ts`. The Journey line and today's highlighter draw themselves in (DrawSVG); a mark tapped into today pops in; the Today greeting writes itself in letter by letter on the first visit of the day (SplitText); checked to-dos glide to the bottom (Flip) and finishing the list bursts gold confetti; completing a board goal stamps its wax seal; chibi Bao toasts bounce in with squash and stretch.

Across the app: each page title rises word by word and its content settles in, while sections further down reveal as you scroll (ScrollTrigger; mark a list with `data-stagger` to stagger its items, a bar with `data-grow` to grow it, or a block with `data-own-motion` to opt out). The sidebar marker slides between pages (Flip). The Reboot Board deals its 36 squares in from the outer ring to the hard centre, then presses earned seals and draws bingo lines; opening a goal unfolds its detail. In the Journal, picking a day turns the page and writes "Dear me," and your signature in with the pen, and counting an entry presses a wax seal. Review numbers count up (`src/Count.tsx`) and the period comparison draws its bars. Everything runs through `gsap.matchMedia()`, so with Reduce Motion on the UI simply appears.
