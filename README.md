# Merge Shift

**Created by Christian Martinez.**

A GitHub-inspired arcade game: pilot a tiny coding bot, arrange falling commit crates into full rows, and keep the merge queue moving.

No dependencies, package installation, or build step. Works on desktop and phones.

## Play online

[Play Merge Shift](https://octobooth-19.github.io/merge-shift/)

Scan this code to play on your phone:

![QR code linking to Merge Shift](qr.png)

[Download the QR code](qr.png)

## Controls

| Action | Desktop | Phone |
| --- | --- | --- |
| Move | Left/right arrows or A/D | Hold left/right |
| Push | Move into a crate with arrows or A/D | Hold left/right into a crate |
| Jump | Space, up arrow, or W | Tap JUMP |
| Pause/resume | P or Escape | PAUSE / RESUME |
| Restart | R | RESTART |

Walking into a crate pushes it automatically. While jumping, crates directly on the floor stay put, so you can climb onto them without shoving them away. While airborne you can push falling crates, plus one special case: jumping from one level below into a two-crate pile pushes its top crate if the space behind it is clear. Settled crates at your takeoff level never move during a jump. A crate supporting another crate cannot be pushed. Touch controls support moving and jumping with multiple fingers.

## Rules

- Fill all eight columns of a row to merge it away.
- Three arms bring commits in from offscreen, release them, and retreat.
- Normal deliveries favor the least-loaded columns, counting settled crates, falling crates, and crates already assigned to other arms. This responds to the actual board instead of following a prearranged sequence.
- Every fourth planned delivery attempts to target the bot's current column, unless that column is already too loaded. Red arms and crates, a red column outline, and a `TARGET LOCKED` warning identify these attacks. Targets stay fixed once chosen, so you can dodge them. Standing still is dangerous.
- Every three merged rows starts a harder sprint. Every two sprints adds another arm, up to six.
- Only descending commits hitting the bot's head are lethal. Side contact and landing on crates are safe. A full-height queue also ends the game.
- Best scores stay in your browser. Leaving the tab pauses play.

## Run locally

Open `index.html` directly, or serve this folder:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

Run the mechanics tests with Node.js:

```sh
node --test game.test.js
```

## Hosting

GitHub Pages serves the root of the `main` branch. Changes pushed to `main` are published automatically. The same URL adapts to phone screens, with a compact play layout and multi-touch controls.

When changing `game.js`, increment its `?v=` script URL in `index.html` so returning players receive the updated engine rather than a cached version.

To regenerate the QR image on macOS, using only system frameworks:

```sh
swift tools/generate-qr.swift https://octobooth-19.github.io/merge-shift/ qr.png
```

Original code and artwork, inspired by classic falling-box phone games. Not affiliated with or endorsed by GitHub or Siemens.
