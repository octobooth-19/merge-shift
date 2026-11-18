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
| Push | Hold Shift + direction | Hold PUSH + direction |
| Jump | Space, up arrow, or W | Tap JUMP |
| Pause/resume | P or Escape | PAUSE / RESUME |
| Restart | R | RESTART |

Pushing is deliberate so jumping onto a crate does not accidentally shove it. You can also push while airborne. Touch controls support multiple fingers; release PUSH when you want to jump onto a crate instead.

## Rules

- Fill all eight columns of a row to merge it away.
- Three arms bring commits in from offscreen, release them, and retreat.
- All arms share a shuffled delivery bag: each group of eight assigned deliveries visits every column once.
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

To regenerate the QR image on macOS, using only system frameworks:

```sh
swift tools/generate-qr.swift https://octobooth-19.github.io/merge-shift/ qr.png
```

Original code and artwork, inspired by classic falling-box phone games. Not affiliated with or endorsed by GitHub or Siemens.
