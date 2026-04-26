# CHANGES — Quest of the Curious

This document summarizes the four commits that expanded the game from a
small 8-challenge prototype into a full loop with economy, achievements,
speed stars, combo streaks, daily challenges, a power-up shop, and a
trophy room.

---

## Commit 1 — Content expansion: 15 challenges per island, 15-node map

Each of the four islands now ships with **15 challenges** per age variant
(default / `-junior` / `-toddler`), organised along a 15-node path that
ends in a **boss node**.

Islands:

- `numbers-reef` — Recife dos Números
- `purrfect-park` — Parque Purrfeito
- `bubble-magic` — Magia das Bolhas
- `crystal-rock` — Rock dos Cristais

State migration (`js/state.js`): existing save files are upgraded on
load. Profiles that previously had only a flat `challenges` array are
re-shaped into `islands['numbers-reef'].challenges`, and any island
missing challenges is padded out to 15 without losing earned stars.

Map screen (`js/screens/map-screen.js`) scales to 15 nodes, highlights
the boss, and keeps the current walk-to-next animation.

---

## Commit 2 — Two new challenge types: fraction-visual, word-problem

- `js/challenges/fraction-visual.js` — pick the shape whose shaded
  fraction matches `data.correct` (e.g. `"3/4"`). Visuals are SVG pies.
- `js/challenges/word-problem.js` — short PT-BR story problem with a
  multiple-choice answer row.

Both extend `ChallengeBase` and integrate with hearts / hints / speech
the same way the existing types do. The `CHALLENGE_TYPES` registry in
`js/screens/challenge-screen.js` now has **6 entries**.

Content for both new types is sprinkled across the 15-challenge sets of
all four islands, in all three age variants.

---

## Commit 3 — Economy, timer, combo, shop, trophies, achievements

This commit is the big one. The moment-to-moment game feel now has
**progression pressure** and a **meta layer**.

### Timer + speed star (`js/challenges/challenge-base.js`)

Every challenge records `startTime` at construction. A new
`earnedSpeedStar()` returns `true` when the player solves on the first
attempt, with no hints, within a difficulty-tuned threshold:

| Difficulty | Threshold |
| ---------- | --------- |
| 1          | 12 s      |
| 2          | 18 s      |
| 3          | 25 s      |
| 4          | 35 s      |
| 5          | 45 s      |

The challenge screen renders a live `⏱️ Ns` counter in the header.

### Combo flame (`js/screens/challenge-screen.js`)

`state.stats.streakCurrent` drives a three-tier flame badge in the
footer:

- streak ≥ 3 → 🔥 (level 1, soft pulse)
- streak ≥ 5 → 🔥🔥 (level 2, stronger pulse)
- streak ≥ 7 → 🔥🔥🔥 (level 3, full blaze)

A wrong answer immediately resets `streakCurrent` to 0 and hides the
badge. `@media (prefers-reduced-motion)` disables the pulse keyframes.

### Power-up shop (`js/screens/shop-screen.js`, route: `#shop`)

Three items, bought with coins and stored on `state.powerUps`:

| Item        | Icon | Cost | Effect |
| ----------- | ---- | ---- | ------ |
| `bonusHint` | 💡   | 10   | Reveals an extra hint during a challenge. |
| `turbo`     | ⚡   | 15   | Doubles the speed-star threshold for the next / current challenge. |
| `skip`      | ⏭️   | 40   | Completes the current challenge with 1 star. |

The challenge screen renders a `.power-up-tray` with one button per
non-zero inventory item; each handler calls `consumePowerUp(kind)` and
applies its effect.

### Daily challenge

Islands screen (`js/screens/islands-screen.js`) adds a **Desafio do Dia**
button that picks a random incomplete challenge across every island,
sets a `sessionStorage` flag `quest:daily-mode`, and routes the player
to that challenge.

- `markDailyStarted()` / `markDailyCompleted()` in `js/state.js` handle
  per-profile state: `dailyChallenge.lastDate` (YYYY-MM-DD),
  `completed`, and `streakDays` (increments when yesterday's daily was
  also completed, otherwise resets to 1).
- `isDailyDoneToday()` disables the button after success.
- Daily mode **doubles** the coin reward on results and shows a yellow
  banner in the challenge header.

### Achievements (`js/engine/achievements.js`)

Nine achievements, each a `{ id, icon, name, desc, check(state) }`
record. `checkAchievements()` runs after every completed challenge,
unlocks any whose `check` returns true, and returns the new ones so the
results screen can show them as toasts.

| ID              | Criteria |
| --------------- | -------- |
| `first-correct` | `totalCorrect >= 1` |
| `streak-5`      | `streakBest >= 5` |
| `streak-10`     | `streakBest >= 10` |
| `coin-100`      | `coins >= 100` |
| `speed-3`       | `speedStars >= 3` |
| `first-boss`    | Any boss node (index 14) completed |
| `all-bosses`    | All 4 boss nodes completed |
| `perfectionist` | All 15 challenges of any island at 3 stars |
| `collector`     | All 4 islands fully completed |

### Trophy room (`js/screens/trophies-screen.js`, route: `#trophies`)

Three sections: unlocked achievements (9 cards, locked cards show 🔒),
island trophies (4 cards with per-island completion + star counts), and
a stats block (best streak, total speed stars, coin total).

### Results screen additions (`js/screens/results-screen.js`)

- Extra ⚡ star rendered when `flags.has('speed')`.
- Yellow speed-note and daily-note banners.
- `.achievement-toast` for each freshly-unlocked achievement passed
  through `sessionStorage.quest:just-unlocked`.
- Coin math is now: `stars * 5 (+3 if 3-star) (+3 if speed) (*2 if daily)`.

### State additions (`js/state.js`)

- `stats.speedStars`, `stats.comboBest`.
- `dailyChallenge.streakDays`.
- `powerUps: { bonusHint, skip, turbo }` with migration overlay.
- New exports: `getAchievementIds`, `unlockAchievement`,
  `getPowerUpInventory`, `addPowerUp`, `consumePowerUp`, `spendCoins`,
  `getTodayStamp`, `isDailyDoneToday`, `markDailyStarted`,
  `markDailyCompleted`.

### Route table (`js/app.js`)

New routes: `shop`, `trophies`.

### URL-encoded flags

Results URL grew from `results/<slug>/<idx>/<stars>` to
`results/<slug>/<idx>/<stars>/<flags>` where `<flags>` is a
comma-separated list drawn from `{speed, daily}`. `parseParams` in
`results-screen.js` stays backward-compatible with the legacy
two-parameter form.

---

## Commit 4 — Solution reveal + this document

### Solution reveal (`js/screens/challenge-screen.js`)

After **3 wrong attempts on the same challenge**, a
**📖 Mostrar solução** button is appended to the power-up tray. Tapping
it renders a `.solution-panel` containing an ordered list of every hint
for that challenge plus the correct answer, so a struggling player can
study the full worked example rather than bouncing off the lockout
screen.

This is pedagogical, not punitive: the button appears alongside the
existing hearts/lockout system, doesn't cost anything, and doesn't
change the stars the player will receive if they then choose to skip.

### CHANGES.md

You're reading it. It summarises the four-commit arc so future-you (or
another contributor) can orient quickly without reading the commit log.

---

## Files added

- `js/challenges/fraction-visual.js`
- `js/challenges/word-problem.js`
- `js/engine/achievements.js`
- `js/screens/shop-screen.js`
- `js/screens/trophies-screen.js`
- `CHANGES.md`

## Files touched

- `css/challenge.css` — timer row, combo flame, power-up tray, reveal
  button, solution panel, daily banner, speed-star throb, achievement
  toasts, shop grid, trophies grid, reduced-motion guards.
- `css/components.css`, `css/map.css`, `css/animations.css`,
  `css/main.css` — smaller polish tweaks across the existing UI.
- `data/*.json` — 15 challenges per variant across all four islands.
- `index.html` — CSS ordering to load new rules.
- `js/app.js` — register `shop` and `trophies` routes.
- `js/challenges/*.js` — base timer / speed-star hook, cosmetic
  consistency for the two new challenge types.
- `js/engine/character.js`, `js/engine/particles.js`,
  `js/engine/sound.js`, `js/engine/theme.js` — small supporting tweaks
  (golden glow for shop purchases, coin-collect sound, profile theme).
- `js/screens/challenge-screen.js` — timer, combo, power-up tray,
  solution reveal, daily mode, achievement hand-off.
- `js/screens/islands-screen.js` — daily/practice/shop/trophies/profile
  action row.
- `js/screens/results-screen.js` — speed star, daily note, achievement
  toasts, updated URL parsing.
- `js/screens/map-screen.js`, `js/screens/profile-screen.js`,
  `js/screens/users-screen.js` — light polish to match the new flow.
- `js/state.js` — power-ups, achievements, daily-challenge, speed-star,
  combo-best state + migration.

## Design notes worth keeping

- Cross-screen one-shot signals use `sessionStorage`
  (`quest:daily-mode`, `quest:turbo-active`, `quest:just-unlocked`)
  instead of the router, so they don't show up in the URL or pollute
  history.
- Turbo is applied at the challenge instance level via
  `currentChallenge.turboBonus = 2`, which means a player can activate
  it mid-challenge from the tray and it still counts at solve time.
- All motion-bearing CSS (combo flame, speed-star throb, achievement
  toasts) is wrapped in `@media (prefers-reduced-motion: reduce)` so
  kids on reduced-motion OS settings get the same feedback without the
  movement.
- No framework, no bundler: plain ES modules, hash router,
  `localStorage` with per-profile migration.

---

## 2026-04-26 — Ella island routing fix, Amanda Kelly voice everywhere, Ava junior-tier UX

Three problems fixed in one pass.

### 0. Ella's `volcano-tots` and `jungle-tots` islands were silently
    redirecting to `numbers-reef`

`js/screens/map-screen.js` had a local `ISLAND_CONFIGS` map with only
the four shared islands. An unknown slug fell through a silent fallback
that *also* persisted `numbers-reef` to `state.currentIsland`, so the
mistake was self-healing — Ella never saw her islands.

- Added `volcano-tots` and `jungle-tots` configs (mascot, decorations,
  ambient, header + bg classes).
- Added `.map-bg-volcano` / `.map-bg-jungle` plus header variants in
  `css/map.css`.
- New `ambientEmbers()` particle helper (`js/engine/particles.js`) with
  warm rising-glow specks for the volcano island.
- The fallback now only logs a `console.warn` so future missing slugs
  surface in the console instead of silently rewriting state.

### 1. All voices now route through the pre-rendered Amanda Kelly mp3s

Previously several screens called `speech.speak()` directly, which fell
through to the browser's default TTS and broke the Amanda Kelly
illusion the moment the user navigated past a challenge.

- `js/engine/speech.js`: extracted `speakPrerendered()` and added
  `speakPhrase()` for non-question lines (mascot speech bubbles,
  encouragement, results reactions, progress headlines). Logs a
  one-shot `console.warn` when an expected hash is missing so the audio
  pipeline can be regenerated.
- `js/i18n.js`: added `STRINGS.resultsByStars` (replacing the inline
  literal in `results-screen.js`) and `STRINGS.progressHeadlineByName`
  (per-name pre-rendered strings — no template substitution at runtime
  so the spoken text matches the visible text exactly).
- `scripts/generate-audio.mjs`: generalized with a `collectPhrases()`
  pass that yields theme correct/wrong, lockout encouragements,
  results-3-star-by-profile, results-by-stars, and the per-name
  progress headlines. Manifest entries now carry
  `kind: 'question' | 'phrase'`. New `--phrases-only` flag re-renders
  only phrase mp3s while preserving `kind: 'question'` entries.
- All `speech.speak()` callers in `challenge-screen.js`,
  `results-screen.js`, `progress-screen.js`, `lockout-screen.js`
  swapped to `speech.speakPhrase()`.

### 2. Ava's junior-tier UX redesigned — audio-first, finger-friendly,
    decision-light

`js/state.js` exposes `isToddlerTier(profile)` and
`isJuniorTier(profile)` so the rest of the codebase stops branching on
raw ages.

UI scoped under `.tier-junior` so Ziva's flow is unaffected:

- Big pulsing **🔊 Ouvir** button on every challenge — junior tier
  treats audio as primary, not optional. Pulse animation stops once
  the kid taps, so it stays a hint rather than a nag.
- 96px answer chips (vs. 68px), 4px border, 24px radius.
- Numeric multiple-choice options ≤10 are augmented with a discrete
  dot count below the numeral, so a 5-year-old can verify by sight.
- First wrong answer on a junior challenge auto-surfaces the first
  hint (rather than waiting for the kid to ask).
- Word-problem keypad keys grow to 72px+, scratchpad is hidden
  entirely.
- Fraction-visual stage scales 1.25× so the slices dominate.
- Auto-advance delays on results / progress screens are
  ~2.2s longer for junior so the kid has time to register the win.
- `theme-ava` results / progress containers now render against a
  moonlit-forest gradient with high-contrast text + tinted reward
  badges, so the celebration feels continuous with Ava's island
  theme. (`theme-ziva` and `theme-ella` got matching tinted
  surrounds for parity.)

### Files touched (this pass)

- `js/screens/map-screen.js` — island configs + warn fallback +
  embers ambient.
- `js/engine/particles.js` — `ambientEmbers()`.
- `css/map.css` — volcano + jungle map backgrounds.
- `js/state.js` — `isToddlerTier()` / `isJuniorTier()`.
- `js/engine/speech.js` — `speakPhrase()` + missing-audio warn.
- `js/i18n.js` — `resultsByStars` + `progressHeadlineByName`.
- `scripts/generate-audio.mjs` — `--phrases-only`, `collectPhrases()`.
- `js/screens/challenge-screen.js`, `practice-screen.js`,
  `results-screen.js`, `progress-screen.js`, `lockout-screen.js` —
  swap to `speakPhrase()`, apply `tier-junior` class, longer
  junior auto-advance.
- `js/challenges/multiple-choice.js`, `sequence-next.js`,
  `fraction-visual.js`, `word-problem.js`, `number-builder.js` —
  auto-hint after first wrong + dot-count for junior multiple-choice.
- `css/challenge.css` — `.tier-junior` section: pulsing 🔊 button,
  big chips, finger-friendly keypad, scratchpad hidden, larger
  fraction stage and continue buttons.
- `css/main.css` — themed results-container backgrounds for
  `theme-ava` / `theme-ziva` / `theme-ella`.
