import type { Tile, TileColor } from '../types';

const COLOR_MAP: Record<TileColor, string> = {
  R: '#ef4444',
  G: '#22c55e',
  B: '#3b82f6',
  Y: '#eab308',
  P: '#a855f7',
};

const GLOW_MAP: Record<TileColor, string> = {
  R: 'rgba(239,68,68,0.4)',
  G: 'rgba(34,197,94,0.4)',
  B: 'rgba(59,130,246,0.4)',
  Y: 'rgba(234,179,8,0.4)',
  P: 'rgba(168,85,247,0.4)',
};

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function renderGrid(
  ctx: CanvasRenderingContext2D,
  grid: (Tile | null)[][],
  rows: number,
  cols: number,
  tileSize: number,
): void {
  ctx.clearRect(0, 0, cols * tileSize, rows * tileSize);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, cols * tileSize, rows * tileSize);

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * tileSize);
    ctx.lineTo(cols * tileSize, r * tileSize);
    ctx.stroke();
  }
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * tileSize, 0);
    ctx.lineTo(c * tileSize, rows * tileSize);
    ctx.stroke();
  }

  const pad = 2;
  const radius = 4;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = grid[r][c];
      if (!tile) continue;

      const x = c * tileSize + pad;
      const y = r * tileSize + pad;
      const w = tileSize - pad * 2;
      const h = tileSize - pad * 2;

      ctx.shadowBlur = 6;
      ctx.shadowColor = GLOW_MAP[tile.color];

      ctx.fillStyle = COLOR_MAP[tile.color];
      drawRoundRect(ctx, x, y, w, h, radius);
      ctx.fill();

      ctx.shadowBlur = 0;

      if (tile.type === 'power') {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = `bold ${tileSize * 0.45}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u2605', c * tileSize + tileSize / 2, r * tileSize + tileSize / 2);
      }

      if (tile.type === 'volatile') {
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2;
        drawRoundRect(ctx, x + 2, y + 2, w - 4, h - 4, radius);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = `bold ${tileSize * 0.5}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', c * tileSize + tileSize / 2, r * tileSize + tileSize / 2);
      }
    }
  }
}
