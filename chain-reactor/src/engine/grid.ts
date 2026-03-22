import type { Tile, TileColor, TileType, Modifiers } from '../types';

export const ROWS = 20;
export const COLS = 10;
export const TILE_SIZE = 30;

const BASE_COLORS: TileColor[] = ['R', 'G', 'B', 'Y'];
const EXTRA_COLORS: TileColor[] = ['P'];

function getColors(extraColors: number): TileColor[] {
  return [...BASE_COLORS, ...EXTRA_COLORS.slice(0, extraColors)];
}

export function createRandomTile(floor: number, extraColors = 0, tilePowerBonus = 0): Tile {
  const colors = getColors(extraColors);
  const color = colors[Math.floor(Math.random() * colors.length)];
  const powerChance = Math.min(0.10 + floor * 0.005, 0.25);
  const volatileChance = Math.min(0.05 + floor * 0.003, 0.15);
  const roll = Math.random();

  let type: TileType = 'basic';
  let power = 1;

  if (roll < volatileChance) {
    type = 'volatile';
  } else if (roll < volatileChance + powerChance) {
    type = 'power';
    power = 2;
  }

  return { type, color, power: power + tilePowerBonus };
}

export function createInitialGrid(floor: number): (Tile | null)[][] {
  const grid: (Tile | null)[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null),
  );
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < COLS; c++) {
      grid[r][c] = createRandomTile(floor);
    }
  }
  return grid;
}

export function spawnRow(
  grid: (Tile | null)[][],
  floor: number,
  modifiers: Modifiers,
): { newGrid: (Tile | null)[][]; overflowDamage: number } {
  let overflowDamage = 0;
  for (let c = 0; c < COLS; c++) {
    const tile = grid[ROWS - 1][c];
    if (tile) {
      overflowDamage += tile.type === 'volatile' ? 10 : 5;
    }
  }

  const newGrid: (Tile | null)[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null),
  );

  for (let c = 0; c < COLS; c++) {
    newGrid[0][c] = createRandomTile(floor, modifiers.extraColors, modifiers.tilePowerBonus);
  }

  for (let r = 0; r < ROWS - 1; r++) {
    for (let c = 0; c < COLS; c++) {
      newGrid[r + 1][c] = grid[r][c];
    }
  }

  return { newGrid, overflowDamage };
}

export function applyGravity(grid: (Tile | null)[][]): (Tile | null)[][] {
  const newGrid: (Tile | null)[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null),
  );

  for (let c = 0; c < COLS; c++) {
    const tiles: Tile[] = [];
    for (let r = 0; r < ROWS; r++) {
      if (grid[r][c] !== null) {
        tiles.push(grid[r][c]!);
      }
    }
    for (let i = 0; i < tiles.length; i++) {
      newGrid[i][c] = tiles[i];
    }
  }

  return newGrid;
}

export function calcDropInterval(floor: number, dropSpeedMultiplier: number): number {
  const base = 2000 / (1 + floor * 0.15);
  return Math.max(base / dropSpeedMultiplier, 300);
}
