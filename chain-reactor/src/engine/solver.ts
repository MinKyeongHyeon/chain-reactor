import type { Tile } from '../types';

interface ExplosionResult {
  destroyed: number;
  totalPower: number;
  grid: (Tile | null)[][];
}

export function triggerExplosion(
  grid: (Tile | null)[][],
  startRow: number,
  startCol: number,
  rows: number,
  cols: number,
  explosionRange = 0,
): ExplosionResult {
  const newGrid = grid.map(row => row.map(cell => (cell ? { ...cell } : null)));
  const target = newGrid[startRow]?.[startCol];
  if (!target) return { destroyed: 0, totalPower: 0, grid };

  const targetColor = target.color;
  const visited = new Set<string>();
  const toDestroy: [number, number][] = [];
  const queue: [number, number][] = [[startRow, startCol]];
  visited.add(`${startRow},${startCol}`);

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const tile = newGrid[r][c];
    if (!tile || tile.color !== targetColor) continue;
    toDestroy.push([r, c]);
    const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      const key = `${nr},${nc}`;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited.has(key)) {
        visited.add(key);
        if (newGrid[nr][nc]?.color === targetColor) {
          queue.push([nr, nc]);
        }
      }
    }
  }

  if (toDestroy.length < 2) return { destroyed: 0, totalPower: 0, grid };

  let totalPower = 0;
  const destroySet = new Set(toDestroy.map(([r, c]) => `${r},${c}`));
  const extraDestroy = new Set<string>();

  for (const [r, c] of toDestroy) {
    const tile = newGrid[r][c]!;
    totalPower += tile.power;
    const range = tile.type === 'power' ? 1 + explosionRange : explosionRange;
    if (range > 0) {
      const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of dirs) {
        for (let dist = 1; dist <= range; dist++) {
          const nr = r + dr * dist;
          const nc = c + dc * dist;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            const key = `${nr},${nc}`;
            if (!destroySet.has(key) && newGrid[nr][nc]) {
              extraDestroy.add(key);
            }
          }
        }
      }
    }
  }

  for (const [r, c] of toDestroy) {
    newGrid[r][c] = null;
  }

  for (const key of extraDestroy) {
    const [r, c] = key.split(',').map(Number);
    if (newGrid[r][c]) {
      totalPower += newGrid[r][c]!.power;
      newGrid[r][c] = null;
    }
  }

  return { destroyed: toDestroy.length + extraDestroy.size, totalPower, grid: newGrid };
}
