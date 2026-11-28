# Project Rules for AI Agents

Read and follow these rules before modifying, committing, or deploying files in this repository.

## 1. Audio Looping Must Always Be `true` (NON-NEGOTIABLE)

- **Rule:** Every audio player object (`Audio`, `MediaAudio`, `PanoramaAudio`, `DirectionalPanoramaAudio`, `PhotoAudio`, `PhotoAlbumAudio`) in the exported 3DVista tour scripts MUST have `"loop":true`.
- **This applies no matter what:** no matter how the audio is configured in 3DVista Studio, no matter whether `autoplay` is on or off, no matter how many tracks/scenes are added. `"loop":true` is mandatory for every audio object, always.
- **Why:** In `lib/tdvplayer.js` / `public/Vista/lib/tdvplayer.js`, the player defaults `loop` to `false` (`this.get("loop",!1)`). Re-publishing or adding/editing scenes in 3DVista Studio overwrites these script files and drops `"loop":true` or writes `"loop":false`. Nobody will notice until the tour is deployed and the music stops after one play.
- **Target files:**
  - `public/Vista/script_general.js`
  - `public/Vista/script_mobile.js`
  - `script_general.js` (root export copy)
  - `script_mobile.js` (root export copy)
- **Required Agent Action — run this BEFORE any commit/push that touches the above files or `public/Vista/`:**
  ```bash
  python scripts/patch-audio-loop.py --check
  ```
  - Exit code `0` = every audio object already has `"loop":true` → proceed.
  - Exit code `1` = something dropped or reset the loop flag → restore it immediately:
    ```bash
    python scripts/patch-audio-loop.py
    ```
    then re-run `--check` to confirm it passes, and include the restored `"loop":true` in the commit.
- **Never** leave an audio object without `"loop":true`, and never "helpfully" set it to `false` — not even for a one-off request — unless the user explicitly asks to disable looping for that specific object, in which case warn them first.
- The patch script is idempotent (safe to run repeatedly) and only writes when a change is actually needed.

## 2. Other Post-Export Checks

- After any 3DVista Studio export into `public/Vista/`, also check the podium POI overlay patch:
  ```bash
  python scripts/patch-team-poi.py --check
  ```
