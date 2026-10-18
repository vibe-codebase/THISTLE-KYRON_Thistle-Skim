# Thistle Skim

By **THISTLE KYRON** · package `com.thistlekyron.thistleskim` · Expo owner `884-888`.

A one-touch game for Android about skipping stones across a lake.

**How it plays.**
- Pull back from the stone in your hand and let go. A dotted arc shows where the first flight will land.
- A flat, fast throw skips, and each skip lands a little shorter than the last. Too steep or too slow, and the stone goes under.
- Every lantern the stone passes catches light. Light them all in as few throws as possible.

**Content.**
- 24 lakes in three chapters:
  - **Morning Mist:** floating lanterns on a still lake.
  - **Lily Pond:** springy lily pads, rocks that turn the stone, and reeds that swallow it.
  - **Lantern Night:** ducks asleep on the water, wind off the hills, and lanterns hung high.
- Par for each lake is found by the game's own solver.
- **Stars are lanterns:** three in par, two for one throw over, one for finishing with the stones in hand.

**Look and sound.**
- Visuals:
  - Three times of day, with parallax hills and mist.
  - A glittering sun or moon path on the water, and reflections of every lantern.
  - Ripples that widen at each skip, and an intro pan from the far shore.
  - A strip map of the whole lake under the title.
- Sound: a Karplus–Strong nylon guitar, birdsong by day and crickets at night, a plip for each skip climbing the scale, and a warm chime as each lantern catches.

## Structure

| Path | What it is |
| --- | --- |
| `web/src/game/sim.ts` | Fixed-step stone physics (skips, pads, rocks, reeds, ducks, wind, lanterns), the aiming preview, and a solver: a fine aim grid plus a minimum set cover gives par |
| `web/src/game/levels.ts` | The 24 lakes and their par |
| `web/tools/par.ts` | Par, and how forgiving each lantern is (the share of the aim grid that lights it) |
| `src/native/` | Expo WebView shell |

```bash
npm install && npm run web:install
npm run web:test     # 33 tests
npm run build:game && npm run validate:assets && npm run android
```

## Release builds

The Android release is configured for Google Play: target and compile SDK 36, R8 minification and resource shrinking, a non-debuggable release build, no Internet permission, and the game served offline from the app's own assets. Builds run on EAS; `eas.json` has two profiles:

```bash
npm install -g eas-cli && eas login
eas init                     # once: links this folder to your Expo project
npm run eas:apk              # preview profile: a signed APK for testing on devices
npm run eas:aab              # production profile: an AAB for Google Play (versionCode auto-increments)
```
