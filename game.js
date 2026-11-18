(function (root) {
  "use strict";
  const COLS = 8, ROWS = 10, PW = 0.62, PH = 0.86;
  const overlap = (a, b) => a.x < b.x + b.w - 0.001 && a.x + a.w > b.x + 0.001 && a.y < b.y + b.h - 0.001 && a.y + a.h > b.y + 0.001;

  class Game {
    constructor(random = Math.random) {
      this.random = random;
      this.reset();
    }
    reset() {
      this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
      for (const x of [0, 1, COLS - 2, COLS - 1]) this.grid[ROWS - 1][x] = true;
      this.grid[ROWS - 2][0] = this.grid[ROWS - 2][COLS - 1] = true;
      this.player = { x: COLS / 2 - PW / 2, y: ROWS - PH, w: PW, h: PH, vy: 0, grounded: true, facing: 1, walk: 0 };
      this.falling = [];
      this.status = "ready";
      this.score = 0;
      this.lines = 0;
      this.level = 1;
      this.elapsed = 0;
      this.deliveryBag = [];
      this.arms = [];
      for (let i = 0; i < 3; i++) this.addArm();
      this.pushClock = 0;
      this.flash = 0;
      this.lastClearScore = 0;
      this.event = "";
      this.previousJump = false;
    }
    get interval() { return Math.max(1.25, 3.2 - (this.level - 1) * 0.18); }
    get warning() { return this.arms.some(arm => this.armWarning(arm)); }
    armWarning(arm) { return !arm.retreat && arm.clock > this.interval - 0.8; }
    aimArm(arm) {
      if (!this.deliveryBag.length) {
        this.deliveryBag = Array.from({ length: COLS }, (_, col) => col);
        for (let i = COLS - 1; i > 0; i--) {
          const j = Math.floor(this.random() * (i + 1));
          [this.deliveryBag[i], this.deliveryBag[j]] = [this.deliveryBag[j], this.deliveryBag[i]];
        }
      }
      arm.col = this.deliveryBag.pop();
    }
    addArm() {
      const i = this.arms.length;
      const arm = {
        side: i % 2 === 0 ? -1 : 1,
        clock: -i * 0.7,
        retreat: false
      };
      this.aimArm(arm);
      this.arms.push(arm);
    }
    armPosition(arm) {
      const progress = arm.retreat ? Math.max(0, -arm.clock / 0.75) :
        Math.min(1, Math.max(0, arm.clock / (this.interval - 0.8)));
      const eased = progress * progress * (3 - 2 * progress);
      const origin = arm.side < 0 ? -1.5 : COLS + 0.5;
      return origin + (arm.col - origin) * eased;
    }
    start() { this.reset(); this.status = "running"; }
    pause() {
      if (this.status === "running") this.status = "paused";
      else if (this.status === "paused") this.status = "running";
    }
    lose(reason) { this.status = "gameover"; this.event = reason; }
    solids(rect) {
      const hits = [];
      for (let y = Math.max(0, Math.floor(rect.y)); y < Math.min(ROWS, Math.ceil(rect.y + rect.h)); y++) {
        for (let x = Math.max(0, Math.floor(rect.x)); x < Math.min(COLS, Math.ceil(rect.x + rect.w)); x++) {
          if (this.grid[y][x] && overlap(rect, { x, y, w: 1, h: 1 })) hits.push({ x, y });
        }
      }
      for (const box of this.falling) {
        if (overlap(rect, { ...box, w: 1, h: 1 })) hits.push(box);
      }
      return hits;
    }
    push(box, direction) {
      const dest = box.x + direction;
      if (dest < 0 || dest >= COLS ||
          this.solids({ x: dest, y: box.y, w: 1, h: 1 }).length ||
          this.solids({ x: box.x, y: box.y - 0.05, w: 1, h: 0.05 }).length) return false;
      if (this.falling.includes(box)) box.x = dest;
      else {
        this.grid[box.y][box.x] = false;
        this.grid[box.y][dest] = true;
      }
      this.pushClock = 0.16;
      this.event = "push";
      this.unsupported();
      this.clearRows();
      return true;
    }
    unsupported() {
      for (let y = ROWS - 2; y >= 0; y--) {
        for (let x = 0; x < COLS; x++) {
          if (this.grid[y][x] && !this.grid[y + 1][x]) {
            this.grid[y][x] = false;
            this.falling.push({ x, y, vy: 0 });
          }
        }
      }
    }
    clearRows() {
      let count = 0;
      for (let y = 0; y < ROWS; y++) {
        if (this.grid[y].every(Boolean)) {
          this.grid[y].fill(false);
          count++;
        }
      }
      if (count) {
        this.lastClearScore = 100 * count * count * this.level;
        this.score += this.lastClearScore;
        this.lines += count;
        this.level = 1 + Math.floor(this.lines / 3);
        while (this.arms.length < Math.min(6, 3 + Math.floor((this.level - 1) / 2))) this.addArm();
        this.flash = 0.5;
        this.event = count > 1 ? `${count} ROW COMBO!` : "ROW CLEARED!";
        this.unsupported();
      }
      return count;
    }
    movePlayer(dt, input) {
      const p = this.player;
      const direction = Number(!!input.right) - Number(!!input.left);
      if (input.jump && !this.previousJump && p.grounded) {
        p.vy = -9.1;
        p.grounded = false;
      }
      this.previousJump = !!input.jump;
      if (direction) {
        p.facing = direction;
        p.walk += dt * 13;
        const next = { ...p, x: Math.max(0, Math.min(COLS - PW, p.x + direction * 4.5 * dt)) };
        let hits = this.solids(next);
        if (input.push && hits.length === 1 && this.pushClock <= 0 && this.push(hits[0], direction)) hits = this.solids(next);
        if (!hits.length) p.x = next.x;
        else p.x = direction > 0 ? Math.min(...hits.map(b => b.x)) - PW : Math.max(...hits.map(b => b.x + 1));
      }
      p.vy = Math.min(15, p.vy + 25 * dt);
      const next = { ...p, y: p.y + p.vy * dt };
      p.grounded = false;
      const hits = this.solids(next).filter(box => p.vy > 0 ?
        p.y + PH <= box.y + 0.001 : p.y >= box.y + 1 - 0.001);
      if (hits.length) {
        if (p.vy > 0) {
          p.y = Math.min(...hits.map(b => b.y)) - PH;
          p.grounded = true;
        } else p.y = Math.max(...hits.map(b => b.y + 1));
        p.vy = 0;
      } else p.y = next.y;
      if (p.y + PH >= ROWS) {
        p.y = ROWS - PH;
        p.vy = 0;
        p.grounded = true;
      }
      if (p.y < 0) { p.y = 0; p.vy = 0; }
    }
    moveCrates(dt, previousPlayer) {
      this.falling.sort((a, b) => b.y - a.y);
      for (const box of [...this.falling]) {
        box.vy = Math.min(9, box.vy + (9 + this.level * 0.5) * dt);
        const oldY = box.y;
        let floor = ROWS, dynamic = false;
        for (let y = Math.max(0, Math.ceil(box.y + 0.99)); y < ROWS; y++) {
          if (this.grid[y][box.x]) { floor = y; break; }
        }
        for (const below of this.falling) {
          if (below !== box && below.x === box.x && below.y >= box.y + 0.99 && below.y < floor) {
            floor = below.y;
            dynamic = true;
          }
        }
        box.y = Math.min(box.y + box.vy * dt, floor - 1);
        const oldGap = oldY + 1 - previousPlayer.y;
        const newGap = box.y + 1 - this.player.y;
        // Only a descending underside crossing the top of the head is lethal.
        if (box.y > oldY && oldGap <= 0.001 && newGap >= 0 && newGap > oldGap) {
          const fraction = Math.max(0, Math.min(1, -oldGap / (newGap - oldGap)));
          const headX = previousPlayer.x + (this.player.x - previousPlayer.x) * fraction;
          if (box.x < headX + PW - 0.06 && box.x + 1 > headX + 0.06) {
            this.lose("A falling commit hit your head.");
            return;
          }
        }
        if (box.y >= floor - 1 - 0.0001) {
          if (dynamic) box.vy = 0;
          else if (box.y < 0) {
            this.lose("The warehouse is full.");
            return;
          } else {
            this.grid[Math.round(box.y)][box.x] = true;
            this.falling.splice(this.falling.indexOf(box), 1);
            this.score += 5;
            this.clearRows();
          }
        }
      }
    }
    update(dt, input = {}) {
      if (this.status !== "running") return;
      dt = Math.min(dt, 1 / 60);
      this.elapsed += dt;
      this.pushClock -= dt;
      this.flash = Math.max(0, this.flash - dt);
      const previousPlayer = { ...this.player };
      this.movePlayer(dt, input);
      if (this.status !== "running") return;
      this.moveCrates(dt, previousPlayer);
      if (this.status !== "running") return;
      for (const arm of this.arms) {
        arm.clock += dt;
        if (arm.retreat) {
          if (arm.clock >= 0) {
            arm.retreat = false;
            arm.clock = 0;
            this.aimArm(arm);
          }
          continue;
        }
        if (arm.clock < this.interval) continue;
        if (this.grid[0][arm.col]) { this.lose("The warehouse is full."); return; }
        if (this.falling.some(box => box.x === arm.col && box.y < 0.85)) continue;
        this.falling.push({ x: arm.col, y: -1 / 6, vy: 0 });
        arm.clock = -0.75;
        arm.retreat = true;
      }
    }
  }
  const api = { Game, COLS, ROWS, PW, PH, overlap };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.StackGame = api;
})(globalThis);
