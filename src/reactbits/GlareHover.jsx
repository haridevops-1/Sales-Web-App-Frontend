import { useRef } from 'react';
import './GlareHover.css';

/**
 * Spikra-themed port of React Bits "Glare Hover".
 * Source: https://reactbits.dev/animations/glare-hover
 * Unlike the stock version (which ships its own box/background/border) this is
 * chrome-less — it overlays a diagonal light sweep on top of an existing themed
 * element on hover, the same "layer over, don't replace" pattern as SpotlightCard.
 */
export default function GlareHover({
  children,
  className = '',
  glareColor = '#ffffff',
  glareOpacity = 0.55,
  glareAngle = -45,
  glareSize = 250,
  transitionDuration = 650
}) {
  const overlayRef = useRef(null);

  const hex = glareColor.replace('#', '');
  let rgba = glareColor;
  if (/^[\dA-Fa-f]{6}$/.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    rgba = `rgba(${r}, ${g}, ${b}, ${glareOpacity})`;
  }

  const animateIn = () => {
    const el = overlayRef.current;
    if (!el) return;
    el.style.transition = 'none';
    el.style.backgroundPosition = '-100% -100%';
    // eslint-disable-next-line no-unused-expressions
    el.offsetHeight;
    el.style.transition = `${transitionDuration}ms ease`;
    el.style.backgroundPosition = '100% 100%';
  };

  const animateOut = () => {
    const el = overlayRef.current;
    if (!el) return;
    el.style.transition = `${transitionDuration}ms ease`;
    el.style.backgroundPosition = '-100% -100%';
  };

  return (
    <div className={`glare-hover-wrap ${className}`} onMouseEnter={animateIn} onMouseLeave={animateOut}>
      <div
        ref={overlayRef}
        className="glare-hover-overlay"
        style={{
          background: `linear-gradient(${glareAngle}deg, hsla(0,0%,0%,0) 60%, ${rgba} 70%, hsla(0,0%,0%,0) 100%)`,
          backgroundSize: `${glareSize}% ${glareSize}%`
        }}
      />
      {children}
    </div>
  );
}
