import { useEffect, useRef } from "react";

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 게임 루프 시작
    const render = () => {
      ctx.fillStyle = "#999"; // 배경색
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 여기에 타일 그리기 로직이 들어갑니다
      requestAnimationFrame(render);
    };

    render();
  }, []);

  return <canvas ref={canvasRef} width={800} height={600} />;
}

export default App;
