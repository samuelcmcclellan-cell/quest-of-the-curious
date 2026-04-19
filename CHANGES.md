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
