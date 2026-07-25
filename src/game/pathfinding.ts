import { MAP_W, MAP_H, walkable } from "./map";

export interface Pt { x: number; y: number; }

const DIRS = [
  { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
  { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }, { x: -1, y: -1 },
];

/**
 * BFS to a target tile. If the target itself is not walkable (a rock, tree,
 * NPC...), finds the shortest path to any walkable tile adjacent to it.
 * Returns the path excluding the start tile, or null if unreachable.
 */
export function findPath(sx: number, sy: number, tx: number, ty: number): Pt[] | null {
  if (sx === tx && sy === ty) return [];
  const key = (x: number, y: number) => y * MAP_W + x;
  const targets = new Set<number>();
  if (walkable(tx, ty)) {
    targets.add(key(tx, ty));
  } else {
    for (const d of DIRS) {
      const nx = tx + d.x, ny = ty + d.y;
      if (walkable(nx, ny)) targets.add(key(nx, ny));
    }
  }
  if (targets.size === 0) return null;

  const prev = new Int32Array(MAP_W * MAP_H).fill(-1);
  const start = key(sx, sy);
  const queue: number[] = [start];
  prev[start] = start;
  let found = -1;

  outer:
  while (queue.length) {
    const cur = queue.shift()!;
    if (targets.has(cur) && cur !== start) { found = cur; break; }
    const cx = cur % MAP_W, cy = Math.floor(cur / MAP_W);
    for (const d of DIRS) {
      const nx = cx + d.x, ny = cy + d.y;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      const nk = key(nx, ny);
      if (prev[nk] !== -1) continue;
      if (!walkable(nx, ny)) continue;
      // no corner-cutting through diagonal blockers
      if (d.x !== 0 && d.y !== 0) {
        if (!walkable(cx + d.x, cy) || !walkable(cx, cy + d.y)) continue;
      }
      prev[nk] = cur;
      if (targets.has(nk)) { found = nk; break outer; }
      queue.push(nk);
    }
  }

  if (found === -1) return null;
  const path: Pt[] = [];
  let cur = found;
  while (cur !== start) {
    path.push({ x: cur % MAP_W, y: Math.floor(cur / MAP_W) });
    cur = prev[cur];
  }
  path.reverse();
  return path;
}

export function adjacentTo(x1: number, y1: number, x2: number, y2: number): boolean {
  return Math.abs(x1 - x2) <= 1 && Math.abs(y1 - y2) <= 1;
}
