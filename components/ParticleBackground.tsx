import React, { useMemo, useState, useEffect, useCallback } from 'react';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  twinkleSpeed: number;
}

interface MousePosition {
  x: number;
  y: number;
}

export const ParticleBackground: React.FC = () => {
  const [mousePos, setMousePos] = useState<MousePosition>({ x: 0, y: 0 });
  const [isMouseInside, setIsMouseInside] = useState(false);

  // 生成随机星星数据
  const stars = useMemo(() => {
    const starCount = 150; // 增加星星数量
    const generatedStars: Star[] = [];
    
    for (let i = 0; i < starCount; i++) {
      generatedStars.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 2, // 2-5px (更大)
        baseOpacity: Math.random() * 0.5 + 0.5, // 0.5-1.0 (更亮)
        twinkleSpeed: Math.random() * 2 + 1,
      });
    }
    
    return generatedStars;
  }, []);

  // 鼠标移动处理
  const handleMouseMove = useCallback((e: MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    setIsMouseInside(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsMouseInside(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseLeave]);

  // 计算星星受鼠标影响后的位置和样式
  const getStarStyle = (star: Star) => {
    const starX = (star.x / 100) * window.innerWidth;
    const starY = (star.y / 100) * window.innerHeight;
    
    let offsetX = 0;
    let offsetY = 0;
    let scale = 1;
    let extraOpacity = 0;
    
    if (isMouseInside) {
      const dx = starX - mousePos.x;
      const dy = starY - mousePos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = 200; // 影响范围
      
      if (distance < maxDistance) {
        const force = (maxDistance - distance) / maxDistance;
        // 星星被鼠标"推开"
        offsetX = (dx / distance) * force * 30;
        offsetY = (dy / distance) * force * 30;
        // 靠近鼠标的星星变亮变大
        scale = 1 + force * 0.5;
        extraOpacity = force * 0.3;
      }
    }
    
    return {
      left: `${star.x}%`,
      top: `${star.y}%`,
      width: `${star.size}px`,
      height: `${star.size}px`,
      opacity: Math.min(1, star.baseOpacity + extraOpacity),
      transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
      transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
      animationDuration: `${star.twinkleSpeed}s`,
    };
  };

  return (
    <div className="particle-background">
      {/* 鼠标光晕效果 */}
      {isMouseInside && (
        <div 
          className="mouse-glow"
          style={{
            left: mousePos.x,
            top: mousePos.y,
          }}
        />
      )}
      
      {stars.map((star) => (
        <div
          key={star.id}
          className={`star ${star.id % 5 === 0 ? 'star-blue' : ''} ${star.id % 7 === 0 ? 'star-warm' : ''} ${star.id % 11 === 0 ? 'star-cyan' : ''}`}
          style={getStarStyle(star)}
        />
      ))}
    </div>
  );
};
