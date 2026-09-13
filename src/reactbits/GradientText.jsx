import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useAnimationFrame, useTransform } from 'motion/react';
import './GradientText.css';

/**
 * Spikra-themed port of React Bits "Gradient Text".
 * Source: https://reactbits.dev/text-animations/gradient-text
 * Defaults to the Spikra orange/blue duotone instead of the stock purple palette.
 */
export default function GradientText({
  children,
  className = '',
  colors = ['#FF6B00', '#FFA352', '#FF6B00'],
  animationSpeed = 6,
  direction = 'horizontal',
  pauseOnHover = false,
  yoyo = true
}) {
  const [isPaused, setIsPaused] = useState(false);
  const progress = useMotionValue(0);
  const elapsedRef = useRef(0);
  const lastTimeRef = useRef(null);

  const animationDuration = animationSpeed * 1000;

  useAnimationFrame((time) => {
    if (isPaused) {
      lastTimeRef.current = null;
      return;
    }

    if (lastTimeRef.current === null) {
      lastTimeRef.current = time;
      return;
    }

    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;
    elapsedRef.current += deltaTime;

    if (yoyo) {
      const fullCycle = animationDuration * 2;
      const cycleTime = elapsedRef.current % fullCycle;

      if (cycleTime < animationDuration) {
        progress.set((cycleTime / animationDuration) * 100);
      } else {
        progress.set(100 - ((cycleTime - animationDuration) / animationDuration) * 100);
      }
    } else {
      progress.set((elapsedRef.current / animationDuration) * 100);
    }
  });

  useEffect(() => {
    elapsedRef.current = 0;
    progress.set(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationSpeed, yoyo]);

  const backgroundPosition = useTransform(progress, (p) =>
    direction === 'vertical' ? `50% ${p}%` : `${p}% 50%`
  );

  const handleMouseEnter = useCallback(() => {
    if (pauseOnHover) setIsPaused(true);
  }, [pauseOnHover]);

  const handleMouseLeave = useCallback(() => {
    if (pauseOnHover) setIsPaused(false);
  }, [pauseOnHover]);

  const gradientAngle = direction === 'vertical' ? 'to bottom' : 'to right';
  const gradientColors = [...colors, colors[0]].join(', ');

  const gradientStyle = {
    backgroundImage: `linear-gradient(${gradientAngle}, ${gradientColors})`,
    backgroundSize: direction === 'vertical' ? '100% 300%' : '300% 100%',
    backgroundRepeat: 'repeat'
  };

  return (
    <motion.span
      className={`gradient-text-bits ${className}`}
      style={{ ...gradientStyle, backgroundPosition }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.span>
  );
}
