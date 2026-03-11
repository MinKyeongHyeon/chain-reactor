export const triggerExplosion = (
  grid: number[][],
  r: number,
  c: number,
  rows: number,
  cols: number,
) => {
  // 경계 검사 및 타일 확인
  if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] === 0) return;

  // 타일 제거
  grid[r][c] = 0;

  // 상하좌우 탐색 (재귀적 연쇄 반응)
  triggerExplosion(grid, r - 1, c, rows, cols); // 위
  triggerExplosion(grid, r + 1, c, rows, cols); // 아래
  triggerExplosion(grid, r, c - 1, rows, cols); // 왼쪽
  triggerExplosion(grid, r, c + 1, rows, cols); // 오른쪽
};
