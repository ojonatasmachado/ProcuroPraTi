import React, { useMemo } from 'react';

const COLORS = ['#2F6FED', '#22C55E', '#F59E0B', '#EC4899', '#8B5CF6'];

// Celebração maior reservada para a criação de procura (evento com mais peso:
// várias empresas notificadas), distinta da confirmação discreta de resposta.
const ConfettiBurst = () => {
  const pieces = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.3,
    duration: 1.6 + Math.random() * 0.9,
    rotate: Math.round(Math.random() * 360),
    drift: Math.round((Math.random() - 0.5) * 140),
    color: COLORS[i % COLORS.length],
    width: 6 + Math.random() * 5,
    height: 10 + Math.random() * 6,
  })), []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-hidden="true">
      {pieces.map(piece => (
        <span
          key={piece.id}
          style={{
            position: 'absolute',
            top: '-16px',
            left: `${piece.left}%`,
            width: piece.width,
            height: piece.height,
            backgroundColor: piece.color,
            borderRadius: 2,
            animation: `confetti-fall ${piece.duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${piece.delay}s forwards`,
            '--confetti-drift': `${piece.drift}px`,
            '--confetti-rotate': `${piece.rotate}deg`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(var(--confetti-drift), 100vh) rotate(var(--confetti-rotate)); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default ConfettiBurst;
