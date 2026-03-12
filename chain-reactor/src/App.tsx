import { useEffect, useRef, useState } from "react";
import { triggerExplosion } from "./engine/solver";

// 1. 상수 설정 (한 곳에서 관리하면 수정이 편합니다)
const ROWS = 20;
const COLS = 20;
const TILE_SIZE = 30;

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 2. 게임의 '두뇌' (데이터 상태)
  const [grid, setGrid] = useState<number[][]>(() =>
    Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => (Math.random() > 0.3 ? 1 : 0)),
    ),
  );

  // 3. Canvas 렌더링 엔진 (데이터가 변할 때마다 화면을 다시 그림)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 화면 지우기 (배경)
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 데이터 기반으로 타일 그리기
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] === 1) {
          ctx.fillStyle = "#4f46e5"; // 타일 색상 (인디고)
          ctx.shadowBlur = 5;
          ctx.shadowColor = "#4f46e5";
          ctx.fillRect(
            c * TILE_SIZE,
            r * TILE_SIZE,
            TILE_SIZE - 2, // 타일 사이 간격을 위해 2px 뺌
            TILE_SIZE - 2,
          );
          ctx.shadowBlur = 0; // 다른 그림에 영향 안 주게 초기화
        }
      }
    }
  }, [grid]); // grid가 변할 때만 Canvas를 다시 그립니다.

  // 4. 클릭 핸들러 (좌표 변환 및 재귀 호출)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 마우스 클릭 위치를 캔버스 내부 좌표로 계산
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 픽셀 좌표 -> 격자 인덱스 변환
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);

    // 기존 그리드 복사 (불변성 유지)
    const newGrid = grid.map((line) => [...line]);

    // 재귀 폭발 알고리즘 실행
    triggerExplosion(newGrid, row, col, ROWS, COLS);

    // 상태 업데이트 -> useEffect 실행 -> Canvas 리렌더링
    setGrid(newGrid);
  };

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "sans-serif",
        color: "white",
        backgroundColor: "#0f172a",
        minHeight: "100vh",
      }}
    >
      <h1>Chain Reactor Engine</h1>
      <p>타일 뭉치를 클릭해서 연쇄 반응을 확인하세요!</p>

      <div style={{ display: "flex", gap: "20px" }}>
        {/* 핵심: Canvas 엔진 */}
        <div
          style={{
            border: "2px solid #334155",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            width={COLS * TILE_SIZE}
            height={ROWS * TILE_SIZE}
            style={{ cursor: "pointer", display: "block" }}
          />
        </div>

        {/* 대조군: 정보창 */}
        <div
          style={{
            padding: "20px",
            background: "#1e293b",
            borderRadius: "8px",
            flex: 1,
          }}
        >
          <h3>Engine Status</h3>
          <p>
            Grid: {ROWS} x {COLS}
          </p>
          <p>Total Tiles: {ROWS * COLS}</p>
          <button
            onClick={() =>
              setGrid(
                Array.from({ length: ROWS }, () =>
                  Array.from({ length: COLS }, () =>
                    Math.random() > 0.3 ? 1 : 0,
                  ),
                ),
              )
            }
            style={{
              padding: "10px 20px",
              cursor: "pointer",
              backgroundColor: "#4f46e5",
              color: "white",
              border: "none",
              borderRadius: "4px",
            }}
          >
            Reset Grid
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
