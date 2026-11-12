import { Direction, GridCoord } from '../../types/game';

interface Node {
  x: number;
  z: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

export class Pathfinding {
  /**
   * Calculates the best next direction for the AI Rival using A* and Flood-Fill space evaluation.
   */
  public static getNextMove(
    start: GridCoord,
    currentDir: Direction,
    targets: GridCoord[],
    obstacles: Set<string>,
    gridWidth: number,
    gridHeight: number
  ): Direction {
    if (targets.length === 0) {
      return this.getSafestAlternative(start, currentDir, obstacles, gridWidth, gridHeight);
    }

    // Find closest target
    let nearestTarget = targets[0];
    let minDistance = Infinity;

    for (const t of targets) {
      const d = Math.abs(t.x - start.x) + Math.abs(t.z - start.z);
      if (d < minDistance) {
        minDistance = d;
        nearestTarget = t;
      }
    }

    // A* Search
    const path = this.findPathAStar(start, nearestTarget, obstacles, gridWidth, gridHeight);

    if (path && path.length > 1) {
      const nextStep = path[1];
      const decidedDir = this.coordsToDirection(start, nextStep);

      // Verify no immediate self-reversal
      if (!this.isOpposite(decidedDir, currentDir)) {
        return decidedDir;
      }
    }

    // If no direct path to food, pick the direction with the largest free flood-fill area
    return this.getSafestAlternative(start, currentDir, obstacles, gridWidth, gridHeight);
  }

  private static findPathAStar(
    start: GridCoord,
    target: GridCoord,
    obstacles: Set<string>,
    width: number,
    height: number
  ): GridCoord[] | null {
    const openSet: Node[] = [];
    const closedSet = new Set<string>();

    const startNode: Node = {
      x: start.x,
      z: start.z,
      g: 0,
      h: this.heuristic(start, target),
      f: this.heuristic(start, target),
      parent: null,
    };

    openSet.push(startNode);

    while (openSet.length > 0) {
      // Pick lowest f node
      let lowestIndex = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[lowestIndex].f) {
          lowestIndex = i;
        }
      }

      const current = openSet.splice(lowestIndex, 1)[0];
      const key = `${current.x},${current.z}`;

      if (current.x === target.x && current.z === target.z) {
        // Reconstruct path
        const path: GridCoord[] = [];
        let curr: Node | null = current;
        while (curr) {
          path.unshift({ x: curr.x, z: curr.z });
          curr = curr.parent;
        }
        return path;
      }

      closedSet.add(key);

      const neighbors = this.getNeighbors(current, width, height);
      for (const n of neighbors) {
        const nKey = `${n.x},${n.z}`;
        if (closedSet.has(nKey) || obstacles.has(nKey)) continue;

        const tentativeG = current.g + 1;
        const existing = openSet.find((item) => item.x === n.x && item.z === n.z);

        if (!existing) {
          const h = this.heuristic(n, target);
          openSet.push({
            x: n.x,
            z: n.z,
            g: tentativeG,
            h,
            f: tentativeG + h,
            parent: current,
          });
        } else if (tentativeG < existing.g) {
          existing.g = tentativeG;
          existing.f = tentativeG + existing.h;
          existing.parent = current;
        }
      }
    }

    return null;
  }

  private static getNeighbors(node: { x: number; z: number }, width: number, height: number): GridCoord[] {
    const res: GridCoord[] = [];
    const dirs = [
      { x: 0, z: -1 }, // UP
      { x: 0, z: 1 },  // DOWN
      { x: -1, z: 0 }, // LEFT
      { x: 1, z: 0 },  // RIGHT
    ];

    for (const d of dirs) {
      const nx = node.x + d.x;
      const nz = node.z + d.z;
      if (nx >= 0 && nx < width && nz >= 0 && nz < height) {
        res.push({ x: nx, z: nz });
      }
    }

    return res;
  }

  private static heuristic(a: GridCoord, b: GridCoord): number {
    return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
  }

  /**
   * Evaluates valid moves by flood-fill area to avoid traps
   */
  private static getSafestAlternative(
    start: GridCoord,
    currentDir: Direction,
    obstacles: Set<string>,
    width: number,
    height: number
  ): Direction {
    const candidates: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    let bestDir = currentDir;
    let maxArea = -1;

    for (const dir of candidates) {
      if (this.isOpposite(dir, currentDir)) continue;

      const next = this.step(start, dir);
      const key = `${next.x},${next.z}`;

      // Check within bounds and no obstacle
      if (next.x < 0 || next.x >= width || next.z < 0 || next.z >= height) continue;
      if (obstacles.has(key)) continue;

      const area = this.floodFillArea(next, obstacles, width, height, 40);
      if (area > maxArea) {
        maxArea = area;
        bestDir = dir;
      }
    }

    return bestDir;
  }

  private static floodFillArea(
    start: GridCoord,
    obstacles: Set<string>,
    width: number,
    height: number,
    maxDepth: number = 30
  ): number {
    const visited = new Set<string>();
    const queue: GridCoord[] = [start];
    visited.add(`${start.x},${start.z}`);

    let count = 0;
    while (queue.length > 0 && count < maxDepth) {
      const curr = queue.shift()!;
      count++;

      const neighbors = this.getNeighbors(curr, width, height);
      for (const n of neighbors) {
        const key = `${n.x},${n.z}`;
        if (!visited.has(key) && !obstacles.has(key)) {
          visited.add(key);
          queue.push(n);
        }
      }
    }

    return count;
  }

  private static step(coord: GridCoord, dir: Direction): GridCoord {
    switch (dir) {
      case 'UP': return { x: coord.x, z: coord.z - 1 };
      case 'DOWN': return { x: coord.x, z: coord.z + 1 };
      case 'LEFT': return { x: coord.x - 1, z: coord.z };
      case 'RIGHT': return { x: coord.x + 1, z: coord.z };
    }
  }

  private static coordsToDirection(from: GridCoord, to: GridCoord): Direction {
    if (to.z < from.z) return 'UP';
    if (to.z > from.z) return 'DOWN';
    if (to.x < from.x) return 'LEFT';
    return 'RIGHT';
  }

  private static isOpposite(d1: Direction, d2: Direction): boolean {
    return (
      (d1 === 'UP' && d2 === 'DOWN') ||
      (d1 === 'DOWN' && d2 === 'UP') ||
      (d1 === 'LEFT' && d2 === 'RIGHT') ||
      (d1 === 'RIGHT' && d2 === 'LEFT')
    );
  }
}
