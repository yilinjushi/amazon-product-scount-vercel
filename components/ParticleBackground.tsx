import React, { useMemo, useState, useEffect, useRef } from 'react';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  depth: number; // 用于视差效果，0-1，越小越远
}

export const ParticleBackground: React.FC = () => {
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // 生成随机星星数据
  const stars = useMemo(() => {
    const starCount = 200; // 增加粒子数量
    const generatedStars: Star[] = [];
    
    for (let i = 0; i < starCount; i++) {
      generatedStars.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2.5 + 1, // 1-3.5px
        opacity: Math.random() * 0.6 + 0.2, // 0.2-0.8
        depth: Math.random(), // 视差深度
      });
    }
    
    return generatedStars;
  }, []);

  // 监听鼠标移动
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 计算鼠标相对于屏幕中心的偏移（归一化到 -1 到 1）
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const offsetX = (e.clientX - centerX) / centerX;
      const offsetY = (e.clientY - centerY) / centerY;
      
      setMouseOffset({ x: offsetX, y: offsetY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div ref={containerRef} className="particle-background">
      {stars.map((star) => {
        // 根据深度计算视差偏移量（深度越小，移动越少）
        const parallaxX = mouseOffset.x * star.depth * 20;
        const parallaxY = mouseOffset.y * star.depth * 20;
        
        return (
          <div
            key={star.id}
            className={`star ${star.id % 5 === 0 ? 'star-blue' : ''} ${star.id % 7 === 0 ? 'star-warm' : ''}`}
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              transform: `translate(${parallaxX}px, ${parallaxY}px)`,
              transition: 'transform 0.15s ease-out',
            }}
          />
        );
      })}
    </div>
  );
};
