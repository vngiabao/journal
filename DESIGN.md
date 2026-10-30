---
name: Project Reboot
description: A private discipline and reflection workspace in the personal website's visual language.
colors:
  blue: "#0b2d5c"
  ink: "#091a2c"
  cream: "#f5f0e6"
  soft: "#faf7f0"
  paper: "#ece3d3"
  muted: "#566273"
  maize: "#c79a2b"
  rule: "#d8d7d1"
  green: "#326450"
  red: "#a04843"
  blue-hover: "#174777"
  secondary-hover: "#e9e9e1"
  sidebar: "#eeeee7"
  segmented: "#eae9e2"
  note: "#ede9dc"
typography:
  display:
    fontFamily: "'Brygada 1918', Georgia, serif"
    fontSize: "clamp(35px, 3.6vw, 53px)"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "'Brygada 1918', Georgia, serif"
    fontSize: "25px"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  title:
    fontFamily: "'Brygada 1918', Georgia, serif"
    fontSize: "21px"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  body:
    fontFamily: "'Mona Sans', 'Helvetica Neue', Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "'Mona Sans', 'Helvetica Neue', Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.55
  small:
    fontFamily: "'Mona Sans', 'Helvetica Neue', Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  journal:
    fontFamily: "'Brygada 1918', Georgia, serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.85
rounded:
  compact: "4px"
  icon: "5px"
  control: "6px"
  segmented: "7px"
  note: "8px"
  panel: "9px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.cream}"
    rounded: "{rounded.control}"
    padding: "10px 17px"
  button-primary-hover:
    backgroundColor: "{colors.blue-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.blue}"
    rounded: "{rounded.control}"
    padding: "10px 17px"
  button-secondary-hover:
    backgroundColor: "{colors.secondary-hover}"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.icon}"
    padding: "0"
    size: "36px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.blue}"
    padding: "8px 0"
  input:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 11px"
  navigation-current:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.cream}"
    rounded: "{rounded.control}"
    padding: "11px 13px"
  segment-selected:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.blue}"
    rounded: "{rounded.compact}"
    padding: "7px 12px"
  badge:
    backgroundColor: "#e8e7df"
    rounded: "{rounded.compact}"
    padding: "3px 7px"
  attention-note:
    backgroundColor: "{colors.note}"
    rounded: "{rounded.note}"
    padding: "20px"
---

# Design System: Project Reboot

## Overview

**Creative North Star: "Personal website companion"**

Project Reboot inherits its visual authority from the sibling personal website at `../Personal Website/Final Ver.`: cream ground, deep blue accents, dark ink, restrained maize details, and self-hosted Mona Sans paired with Brygada 1918. This record merges the provisional design decisions with `src/styles.css` and the React components. No approved visual comp was supplied; implementation follows explicit user visual rules and the personal website source.

The workspace favors quiet section rules, readable task rows, and editorial headings. Its signature is the jagged, directly editable Journey line, echoed by the ascending line mark in navigation. Color and shape communicate state with selective tonal containers. Motion supports immediate control feedback and the mobile drawer; the chart responds directly without animation.

**Key Characteristics:**

- Cream surfaces with deep blue controls and restrained maize markers.
- Serif headings and reflection text, sans-serif controls and dense records.
- Flat, ruled layouts with compact task rows and selective tonal panels.
- A jagged Journey graph that exposes recorded, missing, neutral, and milestone states.
- Responsive layouts and explicit keyboard editing alongside pointer input.

This is documentation extracted from code, not browser or accessibility certification. Surface mode is Operate; daily interaction strategy belongs to the surface brief rather than global tokens.

## Colors

Warm paper and cool blue establish the identity. Green and red communicate recorded outcomes.

### Primary

- **Deep blue**: primary actions, selected navigation, links, progress lines, and recorded Journey segments.
- **Ink**: main text.
- **Blue hover**: primary button hover feedback.

### Secondary

- **Restrained maize**: heading punctuation, selected Journey point, significant moments, small navigation markers, and focus outlines.

### Neutral

- **Cream**: main canvas and text on filled blue actions.
- **Soft**: input backgrounds, selected segments, and classic board tiles.
- **Paper**: backup restore preview.
- **Sidebar**: navigation ground, table headers, and expanded goal details.
- **Muted**: explanations, captions, and inactive controls.
- **Rule**: borders and section dividers.
- **Segmented** and **secondary hover**: control grouping and hover contrast.
- **Note**: the Today attention panel.

Green marks successful records; red marks failures, errors, historical red checks, and destructive actions. Background tints accompany status text and weekly grid symbols. Unrecorded, future, and unscheduled states have distinct symbols or borders.

**The Restrained Accent Rule.** Use maize for small markers and interaction emphasis; preserve cream and blue as the dominant identity.

## Typography

**Display Font:** Brygada 1918, with Georgia and serif fallbacks. Normal and italic files are self-hosted at `/fonts/brygada-1918-normal.woff2` and `/fonts/brygada-1918-italic.woff2`, with weights 400–700.

**Body Font:** Mona Sans, with Helvetica Neue, Arial, and sans-serif fallbacks. The local file is `/fonts/mona-sans-latin-wdth-normal.woff2`, with weights 200–900. All faces use swap; font synthesis is disabled.

The serif supplies a personal, reflective tone while Mona Sans keeps records precise. The hierarchy is role-based rather than a single scale.

- **Display**: page headings use the frontmatter display style. Today uses its own observed clamp (34px–50px). Small-screen page and Today headings resolve to 35px and 36px.
- **Headline**: section headings start from the headline style; contextual sizes range from 22px to 33px.
- **Title**: smaller editorial headings use the title style.
- **Body**: the interface uses the body style; paragraphs are capped at 72ch.
- **Label**: form labels use the label style with a 7px gap above fields.
- **Small**: explanations start from the small style. Dense captions and metadata reduce to 9px–10px.
- **Journal**: the writing area uses the journal style, reduced to 17px on small screens.
- **Emphasis**: strong text defaults to weight 580; primary buttons use 550. Tables and period comparisons use tabular numerals.

**The Role Pairing Rule.** Keep Brygada 1918 for headings and reflection; keep Mona Sans for controls, labels, numbers, and dense records.

English is the default interface. Settings offer English goal names, English plus Vietnamese, or Vietnamese goal names; surrounding interface copy stays English. Preserve accents and label wrapping.

## Layout

Desktop uses a fixed sidebar (235px), topbar (78px), and content capped at 1640px. Main padding is 37px at the top and 45px horizontally. Topbar and content align.

Today puts commitments beside a priorities column (275px) with a 38px gap. Journal has a calendar/index column (240px) and a 40px gap to the editor. Reflection details and record/criteria forms start at three columns. These are surface layouts, not universal containers.

Reusable gaps are in the frontmatter. Larger contextual separations include Today introduction (42px bottom), weekly section (43px top), Journey (45px top margin and 28px top padding), and footer (65px top margin). The provisional 48px spacing and 12px panel radius are not reused implementation tokens.

- **At least 1500px**: Today priorities widen to 320px with a 55px gap; commitment actions can share a row.
- **At most 1200px**: sidebar becomes 205px, horizontal padding becomes 30px, priorities become 240px, classic board becomes three columns, and reflection details become two columns.
- **At most 900px**: sidebar becomes 180px; Today stacks; Journal moves its calendar/index above the editor; forms become two columns.
- **At most 650px**: navigation becomes an off-canvas drawer (235px) below a sticky topbar (64px); main padding becomes 27px 20px 0; forms, reflections, and Journal stack; classic board becomes two columns; filters wrap.

The classic board is six columns on wide screens, three below 1200px, and two below 650px, preserving original order. Tables scroll horizontally: goal table minimum width is 1190px (1100px on wide screens); weekly/review tables use 800px.

Primary buttons have a 44px minimum height and navigation rows 45px. This is not a universal minimum: base fields are 40px, icons 36px, and some compact controls are smaller. On small screens, common icons grow to 40px, task actions to 44px, filters/mood choices to 42px, and weekly cells to 42px; local compact exceptions remain.

## Elevation & Depth

Flat by default: tonal surfaces, thin rules, and selective borders provide grouping without a repeating elevated card grid.

### Shadow Vocabulary

- **Selected segment** (`0 1px 3px #091a2c14`): subtle control lift.
- **Mobile drawer** (`12px 0 30px #091a2c12`): separates the open drawer from content.

Journey uses a chart-specific blue wash (opacity 0.08 to 0) only when actual entries exist.

**The Flat Workspace Rule.** Prefer rules and tonal grouping; reserve shadows for the selected segment and mobile navigation.

## Shapes

Standard buttons/fields use the control radius; icons use the icon radius; badges, checks, and selected segments use the compact radius. Attention notes use the note radius; onboarding and empty commitments use the panel radius.

Records remain open and ruled. Journal writing uses square corners and top/bottom borders. Classic board uses joined grid borders rather than floating cards. Avatar and small markers are circular. Journey segments remain straight and angular.

## Components

### Buttons

Primary buttons use deep blue, cream text, a matching border, 44px minimum height, weight 550, and frontmatter padding/radius. Secondary buttons have a transparent ground, blue text, and gray border (`#b8bfc6`). Icon actions are quiet squares; text actions are blue inline controls.

Background/color transitions last 160ms with `cubic-bezier(.23,1,.32,1)`. Enabled buttons scale to 0.98 on press over 100ms. Disabled buttons have opacity 0.45 and default cursor. Destructive filled actions use red and darker red hover (`#873c38`).

### Inputs / Fields

Fields use soft surfaces, rule borders, blue carets, and frontmatter padding/radius. Base minimum height is 40px. Selects retain native affordances and additional right padding; textareas resize vertically. Journal writing has a transparent ground bounded by rules.

Visible labels and accessible labels explain fields; nearby errors use red, with alert roles where implemented. Retain native disabled behavior.

### Navigation

The sidebar combines an ascending line mark, serif wordmark, quiet sans-serif navigation, and reflective serif footer. Current route is blue/cream with a maize dot and `aria-current="page"`. Thin line icons are commonly 16px–18px.

Mobile navigation slides horizontally over 220ms with shared easing. There is no implemented general panel entrance animation. The toggle has an accessible name; source does not establish dialog focus trapping or expanded-state semantics.

### Segmented controls, tabs, and badges

Segmented controls use a neutral group; selection uses soft/blue and the segment shadow. Goal detail tabs use a selected underline. Status badges pair tint with text. Weekly cells distinguish completed, failed, partial, unrecorded, unscheduled, and future with symbols, borders, and disabled behavior.

### Containers and rows

Commitments, quotas, priorities, reviews, and history use ruled rows. Attention notes, onboarding, restore previews, and expanded details use tonal fills. The attention note is the canonical small container represented in frontmatter.

### Journey

The SVG chart displays cumulative subjective movement, independent of habit results. The recorded line is one continuous blue path through marked days; unmarked days have no dot (superseded dashed gaps, Oct 2026). Recorded dots have cream outlines; milestones and selection use maize. Milestone captions identify significant moments; a dashed vertical guide follows selection/hover.

The graph measures available width. Drawing height is 440 units on desktop, 370 below an observed chart width of 600px, and 225 for Today preview. Final small-screen CSS removes earlier SVG minimum heights and uses 9px captions, 22px empty-state text, and 10px date ticks. Follow the final cascade.

Pointer input selects a day, then places or vertically drags its point. Pointer capture holds the drag; the vertical scale freezes while dragging; release commits and cancellation discards the draft. Updates are immediate.

Full editor is focusable with instructions in its accessible name: Left/Right select dates; Up/Down change cumulative endpoint by one; Enter explicitly records a neutral day; Escape abandons a draft. Buttons offer undo/redo, period movement, zoom, and Today. Notes/milestones require a recorded day. The preview has a visible action to open the full editor.

**The Honest Line Rule.** Preserve the distinction between recorded and missing Journey days, and keep the curve directly controlled by the user rather than inferred from habit completion.

### Accessibility and motion

The shell has a keyboard-visible skip link to main content. Interactive controls and editable SVG use a maize focus outline (2px); controls have a 4px outline offset. Navigation is named; error/success messages use alert/status roles where implemented. Tables retain native structure.

Reduced motion disables all animations/transitions and sets scrolling to auto. Preserve immediate chart editing and its keyboard path. These are implemented affordances, not comprehensive contrast, assistive-technology, or target-size compliance claims.

## 2026-10 evolution

- Oct 12, "Letters to yourself": every day is a letter. Fonts are Cormorant Garamond (letter voice), Source Sans 3 (interface) and Courier Prime (datelines and postmarks only), self-hosted via @fontsource. Typewriter datelines with a letter number, stationery with a red margin rule and blue ruled lines, a "Dear me," salutation and signed close in the journal, postmarks for streaks, wax seals on labelled Journey moments, a fountain-pen curve that passes exactly through every moment (control points clamped so no high or low is exaggerated) ending in a nib, and earlier proof arriving as an envelope from past you. Radii tightened to 6 to 10px for paper.

- Oct 12, cozy redesign: Violet Evergarden palette shared with Shiori (cool letter paper #edf1f7, Prussian blue #23467a / #172c49, ribbon red #a8323e, honey #c9a15a, metal #e2c07f, violet #5a5490, emerald #1f6b57); tokens in `src/tokens.css` supersede the colours above. Phosphor icons at light weight. Completed board squares get a ribbon-red wax seal with a honey ring. Board rings are positional difficulty (outer easier, middle harder, center four hardest), not the sketch's ink colours. Fonts stay Brygada 1918 + Mona Sans.

- Hallmark applied (Oct 12): every colour and font lives in `src/tokens.css`; headings and display labels stay roman; progress fills animate `transform`, never `width`; `overflow-x: clip` on html/body; stamp at the top of `src/styles.css`, history in `.hallmark/log.json`.

- Type scale raised one step (body 14px, meta 12px, nothing below 11px). Radius rule: 4px chips/cells, 6px controls, 10px panels.
- Signature: the Journey line follows the "What growth actually looks like" illustration: upright serif moment labels on leader ticks, a closing arrowhead at the latest mark, one continuous line joining marked days (unmarked days get no dot; a small tick rug marks days in long ranges), a maize band for today, and a word readout while dragging.
- Companion: Bao, an original semi-realistic 3D anime version of the owner (navy three-piece suit, overcoat, silver glasses, blue Overseas watch), appears in page heroes in four moods (wave, cheer, comfort, write) chosen from real records. Chibi Bao (2D, cel-shaded) covers small moments: sidebar avatar, a pop-up when a promise is kept today or a goal completes, empty to-do states, and the night reflection card. Source art lives in art-src/; cutouts in public/art/.
- The Classic board renders the May ink: blue frame, green inner ring, maize center four (also featured on Today with a maize top rule).
- Proof file entries use serif text; kind labels use blue (win), maize text (shot taken), green (lesson).
- Motion: one page entrance (280ms ease-out), check-box tick (220ms), meter fills, drawer (260ms drawer curve). Hover effects are gated to fine pointers; reduced motion keeps only color/opacity changes.
- Oct 23-24, Horizon as a life map (Bao: "me in 5 years - 10 years - at 40... education, relationship, health, connection, ownership, etc as a mind map"). A radial wheel read "creepy"; the rule is hand-drawn Buzan mind maps, one per horizon (this year, 5 years, 10 years, at 40, custom), Me always centred, words on thick organic branches, never rings or spokes.
- Oct 30, retention (Bao: "not motivate me to come back... Think about a way so that I wont drop this"). Today is a two-minute ritual card, one question per step: morning frog, today's three, go; evening ticks, mood + one line, tomorrow; a week step on Saturday evening and Sunday. Then a plain doing view. Bond is the reward: show-up days move him along a hand-drawn trail strip on Today, milestones (3, 7, 14, 21, 30, 50, 75, 100, then every 50 days) press a keepsake stamp. Missed days never shame ("Bond missed you"). No guilt meters (no "Getting started x/y", no "where to next" checklist). Horizon keeps only the mind maps.
- Oct 30, readability floor (Bao, Oct 24: "i despised the small text everywhere"): supersedes the Oct type scale above. Tokens `--fs-label` 14px (labels, captions, small print), `--fs-meta` 16px (secondary lines, buttons, nav, fields), `--fs-ui` 18px (card and help text), `--fs-body`/`--fs-lede` 20px (18px on phones). Nothing under 14px; muted text darkened to #4d5568.
- Oct 30 motion budget: UI motion 160-300ms on `enter` (0.23,1,0.32,1) and `move` (0.77,0,0.175,1), transform and opacity only. Ritual steps rise 14px in 280ms; the finish holds 700ms for the ink stamp (any tap or key cuts it short); the doing view rises 12px in 280ms. Bond's milestone (stamp on the `stamp` ease, a short elastic hop) and Horizon's first arrival are the only longer moments, both skippable by tap or key. Keyboard horizon switching has no fade. Reduced motion leaves everything visible.

## Do's and Don'ts

### Do:

- **Do** preserve the inherited cream, blue, ink, and restrained maize palette.
- **Do** use self-hosted Mona Sans for controls and Brygada 1918 for headings and reflection.
- **Do** group daily work with precise rows, section rules, and selective tonal containers.
- **Do** keep recorded, missing, neutral, future, and historical states visibly distinct.
- **Do** retain pointer and keyboard Journey editing, visible focus, and reduced-motion behavior.
- **Do** preserve English default goal labels and the available Vietnamese label choices.

### Don't:

- **Don't** replace the personal website identity with a new palette or font pairing.
- **Don't** fill the Journey chart with fabricated activity or smooth its jagged segments.
- **Don't** present subjective Journey movement as automatically derived objective progress.
- **Don't** replace the ruled workspace with a grid of decorative statistic cards.
- **Don't** add animation during chart dragging or when reduced motion is requested.
- **Don't** claim a universal 44px control minimum, 12px panel radius, or general panel entrance animation from the provisional record.
