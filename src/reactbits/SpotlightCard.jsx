import { useRef, useState } from 'react';
import './SpotlightCard.css';

/**
 * Spikra-themed port of React Bits "Spotlight Card".
 * Source: https://reactbits.dev/components/spotlight-card
 * Unlike the stock version this ships no card chrome (background/border/radius) —
 * it's meant to overlay an existing themed card and just add the cursor-follow glow.
 */
export default function SpotlightCard({ children, className = '', spotlightColor = 'rgba(255, 133, 51, 0.16)' }) {
  const divRef = useRef(null);
  const [opacity, setOpacity] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`spotlight-card-wrap ${className}`}
    >
      <div
        className="spotlight-card-glow"
        style={{
          opacity,
          background: `radial-gradient(circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 70%)`
        }}
      />
      {children}
    </div>
  );
}
