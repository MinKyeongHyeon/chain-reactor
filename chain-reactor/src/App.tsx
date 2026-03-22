import { useEffect, useRef } from "react";
import { useGameStore } from "./store";
import { renderGrid } from "./renderer/canvas";
import { COLS, ROWS, TILE_SIZE } from "./engine/grid";
import "./App.css";

function App() {
  const store = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const previousTimeRef = useRef<number | undefined>(undefined);

  // Canvas 렌더링
  useEffect(() => {
    if (store.phase !== "COMBAT" && store.phase !== "AUGMENT_SELECT") return;
    const canvas = canvasRef.current;
    if (!canvas || !store.dungeon) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    renderGrid(ctx, store.dungeon.grid, ROWS, COLS, TILE_SIZE);
  }, [store.dungeon?.grid, store.phase]);

  // 타일 하강 루프
  useEffect(() => {
    if (store.phase !== "COMBAT" || !store.dungeon) return;
    const intervalId = setInterval(() => {
      store.dropNewRow();
    }, store.dungeon.dropInterval);
    return () => clearInterval(intervalId);
  }, [store.phase, store.dungeon?.dropInterval, store.dungeon?.floor, store.dropNewRow]);

  // 체력 틱 드레인 루프
  useEffect(() => {
    if (store.phase !== "COMBAT" || !store.dungeon) return;
    if (store.dungeon.modifiers.hpDrainPerSec <= 0) return;

    const animate = (time: number) => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current;
        store.tickHP(deltaTime);
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };
    
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      previousTimeRef.current = undefined;
    };
  }, [store.phase, store.dungeon?.modifiers.hpDrainPerSec, store.tickHP]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (store.phase !== "COMBAT") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);

    store.clickTile(row, col);
  };

  // === 화면별 렌더링 ===

  // 1. MENU
  if (store.phase === "MENU") {
    return (
      <div className="game-container menu-bg">
        <div className="menu-panel">
          <h1 className="title">CHAIN REACTOR</h1>
          <p className="subtitle">액션 로그라이크 퍼즐</p>
          
          <div className="stats-box">
            <h3>강화 현황 (영구 스탯)</h3>
            <p>보유 재화: <span className="highlight-currency">{store.profile.currency} Energy</span></p>
            <ul>
              <li>기본 대미지 계수: x{store.profile.persistentStats.attackPower.toFixed(1)}</li>
              <li>콤보 보너스: +{Math.round(store.profile.persistentStats.comboBonus * 100)}%</li>
              <li>운(희귀 등장 확률): +{Math.round(store.profile.persistentStats.luck * 100)}%</li>
              <li>최대 체력: {store.profile.persistentStats.maxHP}</li>
            </ul>
          </div>
          <button className="btn-primary" onClick={store.startRun}>
            던전 진입
          </button>
        </div>
      </div>
    );
  }

  // 2. RESULT
  if (store.phase === "RESULT") {
    return (
      <div className="game-container result-bg">
        <div className="menu-panel">
          <h1 className="title text-red">SYSTEM OVERLOAD</h1>
          <h2 className="subtitle">체력이 0이 되었습니다.</h2>
          
          <div className="stats-box">
            <h3>런(Run) 결과</h3>
            <p>도달 층수: Floor {store.dungeon?.floor}</p>
            <p>누적 에너지: {store.dungeon?.totalEnergy}</p>
            <p className="highlight-currency">획득 재화: +{Math.floor((store.dungeon?.totalEnergy || 0) * 0.1)}</p>
          </div>
          <button className="btn-primary" onClick={store.continueToMenu}>
            메뉴로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 3. COMBAT & AUGMENT_SELECT
  const isAugmentPhase = store.phase === "AUGMENT_SELECT";

  return (
    <div className="game-container combat-bg">
      {/* 화면 상단 정보: 층수, 스코어 */}
      <div className="top-bar">
        <div className="left-info">
          <h2>Floor {store.dungeon?.floor}</h2>
        </div>
        <div className="center-info">
          <div className="combo-text">
            {store.dungeon && store.dungeon.comboCount > 1 && (
              <span className="combo-pop">{store.dungeon.comboCount} COMBO!</span>
            )}
          </div>
        </div>
        <div className="right-info">
          <h2>Energy: {store.dungeon?.energy} / {store.dungeon?.nextAugmentAt}</h2>
          <p>Total: {store.dungeon?.totalEnergy}</p>
        </div>
      </div>

      {/* 체력(HP) 바 */}
      <div className="hp-container">
        <div 
          className="hp-bar" 
          style={{ width: `${Math.max(0, ((store.dungeon?.hp || 0) / (store.dungeon?.maxHP || 100)) * 100)}%` }}
        />
        <div className="hp-text">{Math.ceil(store.dungeon?.hp || 0)} / {store.dungeon?.maxHP} HP</div>
      </div>

      {/* 메인 캔버스 구역 */}
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={COLS * TILE_SIZE}
          height={ROWS * TILE_SIZE}
          onClick={handleCanvasClick}
          className="board-canvas"
        />

        {/* 증강 선택 오버레이 */}
        {isAugmentPhase && (
          <div className="overlay-modal">
            <h2 className="modal-title">증강 선택 (치명적 오류 방지)</h2>
            <div className="augment-cards">
              {store.augmentChoices.map((aug, idx) => (
                <div 
                  key={`${aug.id}-${idx}`} 
                  className={`augment-card rarity-${aug.rarity}`}
                  onClick={() => store.selectAugment(aug)}
                >
                  <h3 className="aug-name">{aug.name}</h3>
                  <p className="aug-desc">{aug.description}</p>
                  <div className="aug-stats">
                    <span className="benefit">[{aug.benefit.stat}] +{aug.benefit.value}</span>
                    <span className="penalty">[{aug.penalty.stat}] {aug.penalty.value > 0 ? '+' : ''}{aug.penalty.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

