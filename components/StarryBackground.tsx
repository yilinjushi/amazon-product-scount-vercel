import React, { useEffect, useRef } from 'react';

const StarryBackground: React.FC = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let cx = 0;
    let cy = 0;

    const STAR_COUNT = 1000;
    const SPEED = 0.8;
    const FOV = 300;
    const MOUSE_INFLUENCE = 0.05;

    interface Star {
      x: number;
      y: number;
      z: number;
      size: number;
      brightness: number;
    }

    let stars: Star[] = [];
    let mouseX = 0;
    let mouseY = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);

      cx = width / 2;
      cy = height / 2;
    };

    const initStars = () => {
      stars = [];
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
          x: (Math.random() - 0.5) * 4000,
          y: (Math.random() - 0.5) * 4000,
          z: Math.random() * 2000,
          size: Math.random(),
          brightness: Math.random(),
        });
      }
    };

    resize();
    initStars();

    window.addEventListener('resize', resize);

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX - cx) * MOUSE_INFLUENCE;
      mouseY = (e.clientY - cy) * MOUSE_INFLUENCE;
    };
    window.addEventListener('mousemove', handleMouseMove);

    let animationFrameId: number;

    const render = () => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      stars.forEach((star) => {
        star.z -= SPEED;

        if (star.z <= 1) {
          star.z = 2000;
          star.x = (Math.random() - 0.5) * 4000;
          star.y = (Math.random() - 0.5) * 4000;
        }

        const scale = FOV / (FOV + star.z);
        const x2d = cx + (star.x - mouseX * (star.z * 0.1)) * scale;
        const y2d = cy + (star.y - mouseY * (star.z * 0.1)) * scale;

        if (x2d >= 0 && x2d <= width && y2d >= 0 && y2d <= height) {
          const alpha = (1 - star.z / 2000) * star.brightness;
          ctx.beginPath();
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          const r = Math.max(0.6, star.size * scale * 3);
          ctx.arc(x2d, y2d, r, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 bg-black pointer-events-none">
      <canvas ref={canvasRef} className="block w-full h-full" />
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
});

StarryBackground.displayName = 'StarryBackground';

export default StarryBackground;
