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

  // Breadth first search. Returns a list of {c, r} from start to goal
  // (including both), or null if no route exists.
  findPath(start, goal) {
    const cols = this.cols, rows = this.rows;
    const prev = new Int32Array(cols * rows).fill(-1);
    const seen = new Uint8Array(cols * rows);
    const queue = [this.index(start.c, start.r)];
    seen[queue[0]] = 1;
    const goalIdx = this.index(goal.c, goal.r);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      if (cur === goalIdx) break;
      const cc = cur % cols, cr = Math.floor(cur / cols);
      for (const [dc, dr] of dirs) {
        const nc = cc + dc, nr = cr + dr;
        if (!this.isWalkable(nc, nr)) continue;
        const ni = this.index(nc, nr);
        if (seen[ni]) continue;
        seen[ni] = 1;
        prev[ni] = cur;
        queue.push(ni);
      }
    }
    if (!seen[goalIdx]) return null;
    const out = [];
    let cur = goalIdx;
    while (cur !== -1) {
      out.push({ c: cur % cols, r: Math.floor(cur / cols) });
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
