"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Game, ROWS, COLS, PH, PW } = require("./game.js");

function emptyGame() {
  const game = new Game(() => 0.5);
  game.start();
  game.grid.forEach(row => row.fill(false));
  for (const arm of game.arms) arm.clock = -100;
  return game;
}
function advance(game, seconds, input = {}) {
  for (let i = 0; i < seconds * 120; i++) game.update(1 / 120, input);
}
test("walking pushes a single floor crate into a gap", () => {
  const game = emptyGame();
  game.grid[ROWS - 1][4] = true;
  game.player.x = 4 - PW - .01;
  advance(game, .03, { right: true });
  assert.equal(game.grid[ROWS - 1][4], false);
  assert.equal(game.grid[ROWS - 1][5], true);
  assert.equal(game.status, "running");
});
test("stacked crates and blocked destinations cannot be pushed", () => {
  for (const stacked of [true, false]) {
    const game = emptyGame();
    game.grid[ROWS - 1][4] = true;
    game.grid[stacked ? ROWS - 2 : ROWS - 1][stacked ? 4 : 5] = true;
    game.player.x = 4 - PW - .01;
    advance(game, .1, { right: true });
    assert.equal(game.grid[ROWS - 1][4], true);
    assert.ok(game.player.x + PW <= 4.001);
  }
});
test("a completed row clears, scores, and releases unsupported crates", () => {
  const game = emptyGame();
  game.grid[ROWS - 1].fill(true);
  game.grid[ROWS - 2][0] = true;
  assert.equal(game.clearRows(), 1);
  assert.equal(game.score, 100);
  assert.equal(game.lines, 1);
  assert.ok(game.grid[ROWS - 1].every(cell => !cell));
  assert.deepEqual(game.falling.map(b => [b.x, b.y]), [[0, ROWS - 2]]);
  advance(game, .8);
  assert.equal(game.grid[ROWS - 1][0], true);
});
test("every third cleared row increases level and drop speed", () => {
  const game = emptyGame(), initial = game.interval;
  for (let i = 0; i < 3; i++) { game.grid[ROWS - 1].fill(true); game.clearRows(); }
  assert.equal(game.level, 2);
  assert.ok(game.interval < initial);
});
test("jump can clear a crate and holding jump does not auto-repeat", () => {
  const game = emptyGame();
  advance(game, .3, { jump: true });
  assert.ok(game.player.y + PH < ROWS - 1);
  advance(game, .9, { jump: true });
  assert.equal(game.player.y, ROWS - PH);
  advance(game, .2, { jump: true });
  assert.equal(game.player.y, ROWS - PH);
});
test("falling crates crush the player, but safely land away from them", () => {
  const hit = emptyGame();
  hit.falling.push({ x: Math.floor(hit.player.x), y: ROWS - 4, vy: 0 });
  advance(hit, 1);
  assert.equal(hit.status, "gameover");
  assert.match(hit.event, /head/);
  const safe = emptyGame();
  safe.falling.push({ x: 0, y: ROWS - 4, vy: 0 });
  advance(safe, 1);
  assert.equal(safe.status, "running");
  assert.equal(safe.grid[ROWS - 1][0], true);
});
test("same-column falling crates stack without overlapping", () => {
  const game = emptyGame();
  game.falling.push({ x: 0, y: ROWS - 5, vy: 0 }, { x: 0, y: ROWS - 6.5, vy: 9 });
  advance(game, 1.5);
  assert.equal(game.grid[ROWS - 1][0], true);
  assert.equal(game.grid[ROWS - 2][0], true);
  assert.equal(game.falling.length, 0);
});
test("pause freezes simulation and resume continues", () => {
  const game = emptyGame();
  const initialX = game.player.x;
  game.pause();
  advance(game, 1, { right: true });
  assert.equal(game.elapsed, 0);
  assert.equal(game.player.x, initialX);
  game.pause();
  advance(game, .1, { right: true });
  assert.ok(game.player.x > initialX);
});
test("full spawn column ends the shift", () => {
  const game = emptyGame();
  const arm = game.arms[2];
  game.player.x = arm.col < COLS / 2 ? COLS - PW : 0;
  arm.clock = game.interval;
  for (let y = 0; y < ROWS; y++) game.grid[y][arm.col] = true;
  advance(game, .01);
  assert.equal(game.status, "gameover");
  assert.match(game.event, /full/);
});
test("player stays inside warehouse and restart resets progress", () => {
  const game = emptyGame();
  advance(game, 10, { left: true });
  assert.equal(game.player.x, 0);
  advance(game, 10, { right: true });
  assert.equal(game.player.x, COLS - PW);
  game.score = 500; game.lines = 5; game.start();
  assert.equal(game.score, 0);
  assert.equal(game.lines, 0);
  assert.equal(game.falling.length, 0);
});
test("three independent arms deliver to different columns", () => {
  const game = emptyGame();
  game.arms.forEach((arm, i) => {
    arm.col = i;
    arm.clock = game.interval - .001;
  });
  game.update(1 / 120);
  assert.equal(game.falling.length, 3);
  assert.equal(new Set(game.falling.map(box => box.x)).size, 3);
  game.arms.forEach((arm, i) => {
    assert.equal(game.falling[i].x, arm.col);
    assert.equal(arm.retreat, true);
    assert.equal(arm.clock, -.75);
  });
});
test("drop arms are staggered and warn independently", () => {
  const game = new Game(() => .5);
  game.start();
  game.grid.forEach(row => row.fill(false));
  advance(game, 3.25);
  assert.equal(game.falling.length, 1);
  assert.equal(game.armWarning(game.arms[0]), false);
  assert.equal(game.armWarning(game.arms[1]), true);
  advance(game, .7);
  assert.equal(game.falling.length, 2);
});
test("crates have a slower acceleration and terminal speed", () => {
  const game = emptyGame();
  const box = { x: 0, y: 0, vy: 0 };
  game.falling.push(box);
  advance(game, .5);
  assert.ok(box.vy > 4 && box.vy < 5);
  assert.ok(box.y > 1 && box.y < 1.3);
  box.vy = 100;
  game.update(1 / 120);
  assert.equal(box.vy, 9);
});
test("airborne player cannot push a settled floor crate", () => {
  const game = emptyGame();
  game.grid[ROWS - 1][4] = true;
  game.player.x = 4 - PW - .01;
  game.player.y = ROWS - PH - .4;
  game.player.grounded = false;
  game.player.vy = -1;
  game.update(1 / 120, { right: true });
  assert.equal(game.grid[ROWS - 1][4], true);
  assert.equal(game.grid[ROWS - 1][5], false);
  assert.equal(game.status, "running");
});
test("airborne player can shove a falling crate in either direction", () => {
  for (const direction of [-1, 1]) {
    const game = emptyGame();
    const box = { x: 4, y: 5, vy: 2 };
    game.falling.push(box);
    game.player.x = direction > 0 ? 4 - PW - .01 : 5.01;
    game.player.y = 5.3;
    game.player.vy = -1;
    game.player.grounded = false;
    game.update(1 / 120, { right: direction > 0, left: direction < 0 });
    assert.equal(box.x, 4 + direction);
    assert.equal(game.status, "running");
  }
});
test("air pushes cannot shove through another falling crate or a wall", () => {
  for (const x of [4, COLS - 1]) {
    const game = emptyGame();
    const box = { x, y: 5, vy: 0 };
    game.falling.push(box);
    if (x === 4) game.falling.push({ x: 5, y: 5.2, vy: 0 });
    game.player.x = x - PW - .01;
    game.player.y = 5.2;
    game.player.grounded = false;
    game.update(1 / 120, { right: true });
    assert.equal(box.x, x);
    assert.equal(game.status, "running");
  }
});
test("falling-crate side contact is harmless", () => {
  const game = emptyGame();
  const box = { x: 4, y: ROWS - 1.5, vy: 1 };
  game.player.x = 4 - PW + .1;
  game.falling.push(box);
  game.update(1 / 120);
  assert.equal(game.status, "running");
  assert.equal(game.player.y, ROWS - PH);
});
test("landing on top of a falling crate is harmless", () => {
  const game = emptyGame();
  const box = { x: 4, y: 6, vy: 2 };
  game.falling.push(box);
  game.player.x = 4.2;
  game.player.y = box.y - PH - .005;
  game.player.vy = 3;
  game.player.grounded = false;
  advance(game, .2);
  assert.equal(game.status, "running");
  assert.ok(game.player.y + PH <= box.y + .05);
});
test("a fast descending crate cannot tunnel through the head", () => {
  const game = emptyGame();
  game.player.x = 4.2;
  game.falling.push({ x: 4, y: game.player.y - 1.02, vy: 9 });
  game.update(1 / 120);
  assert.equal(game.status, "gameover");
  assert.match(game.event, /head/);
});
test("a crate grazing outside the head is not lethal", () => {
  const game = emptyGame();
  game.player.x = 5 - .04;
  game.falling.push({ x: 4, y: game.player.y - 1.02, vy: 9 });
  game.update(1 / 120);
  assert.equal(game.status, "running");
});
test("arms carry in from offscreen, release, retreat empty, and return", () => {
  const game = emptyGame(), arm = game.arms[0];
  arm.clock = 0;
  assert.ok(game.armPosition(arm) < -1);
  advance(game, 1);
  assert.ok(game.armPosition(arm) > -1.5 && game.armPosition(arm) < arm.col);
  arm.clock = game.interval - .001;
  game.update(1 / 120);
  const delivered = game.falling[0];
  assert.equal(delivered.x, arm.col);
  assert.ok(Math.abs(game.armPosition(arm) - arm.col) < .001);
  assert.equal(arm.retreat, true);
  advance(game, .4);
  assert.ok(game.armPosition(arm) < arm.col);
  advance(game, .4);
  assert.equal(arm.retreat, false);
  assert.ok(game.armPosition(arm) < -1);
  assert.equal(game.falling.length, 1);
});
test("harder sprints add delivery arms up to six", () => {
  const game = emptyGame();
  for (let rows = 1; rows <= 30; rows++) {
    game.grid[ROWS - 1].fill(true);
    game.clearRows();
    assert.equal(game.arms.length, Math.min(6, 3 + Math.floor((game.level - 1) / 2)));
  }
  game.start();
  assert.equal(game.arms.length, 3);
});
test("delivery waits for a preceding crate to clear the entrance", () => {
  const game = emptyGame(), arm = game.arms[0];
  arm.clock = game.interval;
  game.falling.push({ x: arm.col, y: -.1, vy: 0 });
  game.update(1 / 120);
  assert.equal(game.falling.length, 1);
  assert.equal(arm.retreat, false);
  advance(game, .6);
  assert.equal(game.falling.length, 2);
  assert.equal(arm.retreat, true);
});
test("delivery load counts settled, airborne, and reserved crates", () => {
  const game = emptyGame();
  game.arms = [];
  game.grid[ROWS - 1].fill(true);
  for (let y = ROWS - 4; y < ROWS - 1; y++) game.grid[y][0] = true;
  game.falling.push({ x: 1, y: 1, vy: 0 });
  game.arms.push({ col: 2, retreat: false });
  const arm = { retreat: false };
  game.arms.push(arm);
  game.dispatches = 0;
  game.aimArm(arm);
  assert.equal(game.columnLoads(arm)[0], 4);
  assert.equal(game.columnLoads(arm)[1], 2);
  assert.equal(game.columnLoads(arm)[2], 2);
});
test("normal deliveries cluster, then move their bias without starving columns", () => {
  for (let seed = 1; seed <= 16; seed++) {
    let value = seed;
    const game = new Game(() => {
      value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
      return value / 4294967296;
    });
    game.arms = [];
    game.grid.forEach(row => row.fill(false));
    const visited = new Set();
    let previousBias = game.biasCol;
    for (let phase = 0; phase < 8; phase++) {
      game.elapsed = phase * 12;
      let favorites = 0;
      for (let i = 0; i < 400; i++) {
        game.dispatches = 0;
        const arm = {};
        game.aimArm(arm);
        visited.add(arm.col);
        if (Math.abs(arm.col - game.biasCol) <= 1) favorites++;
      }
      if (phase > 0) {
        const shift = (game.biasCol - previousBias + COLS) % COLS;
        assert.ok(shift >= 3 && shift <= 5, `seed ${seed}: bias did not move away`);
      }
      assert.ok(favorites > 240, `seed ${seed}, phase ${phase}: only ${favorites} favored drops`);
      previousBias = game.biasCol;
    }
    assert.equal(visited.size, COLS);
  }
});
test("crowding softens the bias instead of automatically filling every gap", () => {
  const game = emptyGame(), arm = {};
  game.arms = [];
  game.biasCol = 3;
  for (let y = ROWS - 3; y < ROWS; y++) game.grid[y][3] = true;
  game.dispatches = 0;
  game.random = () => .5;
  game.aimArm(arm);
  assert.equal(arm.col, 3);
  assert.equal(game.grid[ROWS - 1][4], false);
});
test("untouched deliveries build uneven piles rather than completing rows for the player", () => {
  for (let seed = 1; seed <= 16; seed++) {
    let value = seed;
    const game = new Game(() => {
      value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
      return value / 4294967296;
    });
    game.start();
    game.arms = [];
    game.grid.forEach(row => row.fill(false));
    for (let i = 0; i < COLS * 3; i++) {
      game.elapsed = i * 1.3;
      const arm = {};
      game.aimArm(arm);
      let y = ROWS - 1;
      while (y >= 0 && game.grid[y][arm.col]) y--;
      assert.ok(y >= 0, `seed ${seed}: piled up before the bias could move`);
      game.grid[y][arm.col] = true;
      game.clearRows();
    }
    const loads = game.columnLoads();
    assert.ok(game.lines <= 1, `seed ${seed}: ${game.lines} automatic rows`);
    assert.ok(Math.max(...loads) - Math.min(...loads) >= 3, `seed ${seed}: piles too balanced`);
  }
});
test("jumping onto a floor crate never shoves it in either direction", () => {
  for (const direction of [-1, 1]) {
    const game = emptyGame();
    game.grid[ROWS - 1][4] = true;
    game.player.x = direction > 0 ? 4 - PW - .01 : 5.01;
    const input = { right: direction > 0, left: direction < 0, jump: true };
    advance(game, .5, input);
    assert.equal(game.grid[ROWS - 1][4], true);
    assert.equal(game.grid[ROWS - 1][4 + direction], false);
    assert.ok(game.player.y + PH <= ROWS - 1 + .01);
  }
});
test("walking into a floor crate pushes with arrows alone", () => {
  const game = emptyGame();
  game.grid[ROWS - 1][4] = true;
  game.player.x = 4 - PW - .01;
  advance(game, .03, { right: true });
  assert.equal(game.grid[ROWS - 1][5], true);
});
test("jumping from below can push a two-crate stack's top crate but not its base", () => {
  for (const direction of [-1, 1]) {
    const game = emptyGame();
    game.grid[ROWS - 1][4] = true;
    game.grid[ROWS - 2][4] = true;
    game.player.x = direction > 0 ? 4 - PW - .01 : 5.01;
    for (let i = 0; i < 60 && game.grid[ROWS - 2][4]; i++) {
      game.update(1 / 120, { left: direction < 0, right: direction > 0, jump: true });
    }
    assert.equal(game.grid[ROWS - 1][4], true);
    assert.equal(game.grid[ROWS - 2][4], false);
    assert.ok(game.falling.some(box => box.x === 4 + direction));
    assert.equal(game.status, "running");
  }
});
test("a stack's top crate cannot be air-pushed into another crate", () => {
  for (const direction of [-1, 1]) {
    const game = emptyGame();
    for (const x of [4, 4 + direction]) {
      game.grid[ROWS - 1][x] = true;
      game.grid[ROWS - 2][x] = true;
    }
    game.player.x = direction > 0 ? 4 - PW - .01 : 5.01;
    advance(game, .45, { left: direction < 0, right: direction > 0, jump: true });
    assert.equal(game.grid[ROWS - 2][4], true);
    assert.equal(game.grid[ROWS - 2][4 + direction], true);
    assert.equal(game.grid[ROWS - 1][4], true);
  }
});
test("landing on a falling crate does not accidentally shove its top edge", () => {
  const game = emptyGame(), box = { x: 4, y: 6, vy: 0 };
  game.falling.push(box);
  game.player.x = 4 - PW - .01;
  game.player.y = box.y - PH + .05;
  game.player.vy = 1;
  game.player.grounded = false;
  game.update(1 / 120, { right: true });
  assert.equal(box.x, 4);
});
test("every fourth planned delivery can target the bot without overloading its column", () => {
  const game = emptyGame(), arm = game.arms[0];
  game.arms = [arm];
  game.player.x = 4.2;
  game.dispatches = 3;
  game.aimArm(arm);
  assert.equal(arm.targeted, true);
  assert.equal(arm.col, 4);
  game.grid[ROWS - 1][4] = true;
  game.grid[ROWS - 2][4] = true;
  game.dispatches = 3;
  game.aimArm(arm);
  assert.equal(arm.targeted, false);
  assert.ok(arm.col >= 0 && arm.col < COLS);
});
test("targeted deliveries warn, stay locked, and can be dodged", () => {
  const game = emptyGame(), arm = game.arms[0];
  game.arms = [arm];
  game.player.x = 4.2;
  game.dispatches = 3;
  game.aimArm(arm);
  assert.equal(arm.targeted, true);
  arm.clock = game.interval - .79;
  assert.equal(game.targetedWarning, true);
  advance(game, .82, { right: true });
  assert.equal(arm.col, 4);
  assert.ok(game.falling.some(box => box.x === 4 && box.targeted));
  assert.equal(game.targetedWarning, false);
  advance(game, 1.8);
  assert.equal(game.status, "running");
});
test("standing still is not a viable strategy across seeds and starting columns", () => {
  for (let seed = 1; seed <= 32; seed++) {
    let value = seed;
    const game = new Game(() => {
      value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
      return value / 4294967296;
    });
    game.start();
    game.player.x = 2 + seed % 4 + .1;
    advance(game, 20);
    assert.equal(game.status, "gameover", `seed ${seed} survived idle`);
    assert.match(game.event, /head|full/, `seed ${seed}`);
  }
});
test("jumping from a stack top's own level never shoves that settled crate", () => {
  for (const direction of [-1, 1]) {
    const game = emptyGame();
    const standCol = 4 - direction;
    game.grid[ROWS - 1][standCol] = true;
    game.grid[ROWS - 1][4] = true;
    game.grid[ROWS - 2][4] = true;
    game.player.x = direction > 0 ? 4 - PW - .01 : 5.01;
    game.player.y = ROWS - 1 - PH;
    advance(game, .6, { left: direction < 0, right: direction > 0, jump: true });
    assert.equal(game.grid[ROWS - 2][4], true);
    assert.equal(game.status, "running");
  }
});
test("raised-level jump into a two-crate stack above it also pushes the top", () => {
  const game = emptyGame();
  game.grid[ROWS - 1][3] = true;
  for (const y of [ROWS - 1, ROWS - 2, ROWS - 3]) game.grid[y][4] = true;
  game.player.x = 4 - PW - .01;
  game.player.y = ROWS - 1 - PH;
  for (let i = 0; i < 60 && game.grid[ROWS - 3][4]; i++) game.update(1 / 120, { right: true, jump: true });
  assert.equal(game.grid[ROWS - 3][4], false);
  assert.equal(game.grid[ROWS - 2][4], true);
});
test("locked crates cannot be pushed once landed but clear with full rows", () => {
  const game = emptyGame();
  game.falling.push({ x: 4, y: ROWS - 1.5, vy: 0, locked: true });
  advance(game, .5);
  assert.equal(game.grid[ROWS - 1][4], true);
  assert.equal(game.locked[ROWS - 1][4], true);
  game.player.x = 4 - PW - .01;
  advance(game, .4, { right: true });
  assert.equal(game.grid[ROWS - 1][4], true);
  assert.equal(game.grid[ROWS - 1][5], false);
  for (let x = 0; x < COLS; x++) if (x !== 4) game.grid[ROWS - 1][x] = true;
  game.grid[ROWS - 2][4] = true;
  game.clearRows();
  assert.equal(game.locked[ROWS - 1][4], false);
  assert.ok(game.falling.some(box => box.x === 4 && !box.locked));
});
test("locked crates can still be shoved while falling and stay locked after unsupported drops", () => {
  const game = emptyGame(), box = { x: 4, y: ROWS - 1.3, vy: 0, locked: true };
  game.falling.push(box);
  game.player.x = 4 - PW - .01;
  game.update(1 / 120, { right: true });
  assert.equal(box.x, 5);
  advance(game, 1);
  assert.equal(game.locked[ROWS - 1][5], true);
  game.grid[ROWS - 2][5] = true;
  game.locked[ROWS - 2][5] = true;
  game.grid[ROWS - 1][5] = false;
  game.locked[ROWS - 1][5] = false;
  game.unsupported();
  assert.ok(game.falling.some(b => b.x === 5 && b.locked));
});
test("arms deliver locked crates periodically, never on targeted drops", () => {
  const game = new Game(() => 0.5);
  game.start();
  let locked = 0;
  for (let i = 0; i < 60; i++) {
    const arm = { side: 1, clock: 0, retreat: false };
    game.aimArm(arm);
    if (arm.locked) { locked++; assert.equal(arm.targeted, false); }
  }
  assert.ok(locked >= 8 && locked <= 14, `locked=${locked}`);
});
