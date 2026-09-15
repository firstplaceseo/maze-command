// Grid and pathfinding for Maze Command.
// Pure logic, no Phaser here, so it can be tested on its own.

window.TD = window.TD || {};

TD.Grid = class Grid {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    // What sits on each cell: null, 'tower' or 'wall'
    this.cells = new Array(cols * rows).fill(null);
    // Enemies enter here and leave here
    this.spawn = { c: Math.floor(cols / 2), r: 0 };
    this.exit = { c: Math.floor(cols / 2), r: rows - 1 };
    this.path = this.findPath(this.spawn, this.exit);
  }

  index(c, r) { return r * this.cols + c; }
  inBounds(c, r) { return c >= 0 && r >= 0 && c < this.cols && r < this.rows; }
  get(c, r) { return this.cells[this.index(c, r)]; }
  set(c, r, value) { this.cells[this.index(c, r)] = value; }

  // Spawn row and exit row cannot be built on. Everything else can.
  isBuildable(c, r) {
    if (!this.inBounds(c, r)) return false;
    if (r === this.spawn.r || r === this.exit.r) return false;
    return this.get(c, r) === null;
  }

  isWalkable(c, r) {
    return this.inBounds(c, r) && this.get(c, r) === null;
  }

  // Shortest route with a tiny penalty for turning, so among equally short
  // routes the enemies pick the straightest one (it reads as "the fastest
  // way" rather than a wander). Returns a list of {c, r} from start to goal,
  // or null if no route exists.
  findPath(start, goal) {
    const cols = this.cols, rows = this.rows, n = cols * rows;
    const STEP = 1000, TURN = 1;
    // state = cell * 4 + direction of arrival (0 right, 1 left, 2 down, 3 up)
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const dist = new Float64Array(n * 4).fill(Infinity);
    const prev = new Int32Array(n * 4).fill(-1);
    const done = new Uint8Array(n * 4);
    const sIdx = this.index(start.c, start.r), gIdx = this.index(goal.c, goal.r);
    const open = [];
    for (let d = 0; d < 4; d++) { dist[sIdx * 4 + d] = 0; open.push(sIdx * 4 + d); }
    let goalState = -1;
    while (open.length) {
      // pick the cheapest open state (small grid, a scan is fine)
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (dist[open[i]] < dist[open[bi]]) bi = i;
      const cur = open[bi]; open[bi] = open[open.length - 1]; open.pop();
      if (done[cur]) continue;
      done[cur] = 1;
      const cell = cur >> 2, cd = cur & 3;
      if (cell === gIdx) { goalState = cur; break; }
      const cc = cell % cols, cr = Math.floor(cell / cols);
      for (let d = 0; d < 4; d++) {
        const nc = cc + dirs[d][0], nr = cr + dirs[d][1];
        if (!this.isWalkable(nc, nr)) continue;
        const ns = this.index(nc, nr) * 4 + d;
        if (done[ns]) continue;
        const cost = dist[cur] + STEP + (cell !== sIdx && d !== cd ? TURN : 0);
        if (cost < dist[ns]) { dist[ns] = cost; prev[ns] = cur; open.push(ns); }
      }
    }
    if (goalState < 0) return null;
    const out = [];
    let cur = goalState;
    while (cur !== -1) {
      const cell = cur >> 2;
      if (!out.length || out[out.length - 1].c !== cell % cols || out[out.length - 1].r !== Math.floor(cell / cols)) out.push({ c: cell % cols, r: Math.floor(cell / cols) });
      cur = prev[cur];
    }
    return out.reverse();
  }

  // Would placing something at (c, r) still leave a route open?
  canPlace(c, r) {
    if (!this.isBuildable(c, r)) return false;
    this.set(c, r, 'test');
    const ok = this.findPath(this.spawn, this.exit) !== null;
    this.set(c, r, null);
    return ok;
  }

  place(c, r, value) {
    this.set(c, r, value);
    this.path = this.findPath(this.spawn, this.exit);
  }

  remove(c, r) {
    this.set(c, r, null);
    this.path = this.findPath(this.spawn, this.exit);
  }

  // Path from any cell to the exit (used when the maze changes mid wave)
  pathFrom(c, r) {
    return this.findPath({ c, r }, this.exit);
  }
};
