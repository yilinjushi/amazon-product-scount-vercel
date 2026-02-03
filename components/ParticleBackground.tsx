import React, { useMemo } from 'react';

interface Star {
  id: number;
  left: string;
  top: string;
  size: number;
  animationDelay: string;
  animationDuration: string;
  opacity: number;
}

export const ParticleBackground: React.FC = () => {
  // 生成随机星星数据
  const stars = useMemo(() => {
    const starCount = 80;
    const generatedStars: Star[] = [];
    
    for (let i = 0; i < starCount; i++) {
      generatedStars.push({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: Math.random() * 2 + 1, // 1-3px
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${Math.random() * 3 + 2}s`, // 2-5s
        opacity: Math.random() * 0.5 + 0.3, // 0.3-0.8
      });
    }
    
    return generatedStars;
  }, []);

  return (
    <div className="particle-background">
      {stars.map((star) => (
        <div
          key={star.id}
          className="star"
          style={{
            left: star.left,
            top: star.top,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDelay: star.animationDelay,
            animationDuration: star.animationDuration,
            opacity: star.opacity,
          }}
        />
      ))}
    </div>
  );
};
