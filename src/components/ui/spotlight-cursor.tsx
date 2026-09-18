'use client';
import { useRef, useEffect, HTMLAttributes } from 'react';

interface SpotlightConfig {
  radius?: number;
  brightness?: number;
  color?: string;
  smoothing?: number;
}

const useSpotlightEffect = (config: SpotlightConfig) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let mouseX = -1000;
    let mouseY = -1000;
    let currentX = -1000;
    let currentY = -1000;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const handleMouseMove = (event: MouseEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    const handleMouseLeave = () => {
      mouseX = -1000;
      mouseY = -1000;
    };

    const hexToRgb = (hex: string) => {
      const bigint = parseInt(hex.slice(1), 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `${r},${g},${b}`;
    };

    const smoothing = config.smoothing ?? 0.15;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (mouseX !== -1000 && mouseY !== -1000) {
        if (currentX === -1000) {
          currentX = mouseX;
          currentY = mouseY;
        } else {
          currentX += (mouseX - currentX) * smoothing;
          currentY += (mouseY - currentY) * smoothing;
        }

        const gradient = ctx.createRadialGradient(
          currentX, currentY, 0,
          currentX, currentY, config.radius || 240
        );
        const rgbColor = hexToRgb(config.color || '#FF7A1A');
        const brightness = config.brightness ?? 0.08;
        gradient.addColorStop(0, `rgba(${rgbColor}, ${brightness})`);
        gradient.addColorStop(0.45, `rgba(${rgbColor}, ${brightness * 0.4})`);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        currentX = -1000;
        currentY = -1000;
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    animationFrameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [config.radius, config.brightness, config.color, config.smoothing]);

  return canvasRef;
};

export interface SpotlightCursorProps extends HTMLAttributes<HTMLCanvasElement> {
  config?: SpotlightConfig;
}

export const Component = ({
  config = {},
  className = '',
  ...rest
}: SpotlightCursorProps) => {
  const spotlightConfig: SpotlightConfig = {
    radius: 240,
    brightness: 0.08,
    color: '#FF7A1A',
    smoothing: 0.15,
    ...config,
  };

  const canvasRef = useSpotlightEffect(spotlightConfig);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-[9999] w-full h-full ${className}`}
      {...rest}
    />
  );
};

export const SpotlightCursor = Component;
export default SpotlightCursor;
