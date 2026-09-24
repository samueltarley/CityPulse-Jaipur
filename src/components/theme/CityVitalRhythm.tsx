import React, { useEffect, useRef } from 'react';

export interface CityVitalRhythmProps {
  score?: number;
  band?: string;
  color?: string;
  theme?: string;
  className?: string;
}

interface RGBColor {
  r: number;
  g: number;
  b: number;
}

// Helper to convert Hex color to RGB
function parseColorToRGB(hexOrColor?: string): RGBColor {
  if (!hexOrColor) return { r: 8, g: 145, b: 178 }; // #0891b2
  let color = hexOrColor.trim();

  // Named / shorthand colors fallback
  if (color === 'calm') return { r: 14, g: 116, b: 144 };
  if (color === 'watch') return { r: 217, g: 119, b: 6 };
  if (color === 'stressed') return { r: 234, g: 88, b: 12 };
  if (color === 'critical') return { r: 225, g: 29, b: 72 };

  if (color.startsWith('#')) {
    color = color.substring(1);
    if (color.length === 3) {
      color = color.split('').map((c) => c + c).join('');
    }
    if (color.length === 6) {
      const num = parseInt(color, 16);
      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255,
      };
    }
  }

  // RGB / RGBA fallback
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (match) {
    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10),
    };
  }

  return { r: 8, g: 145, b: 178 };
}

function calculateSpeedFromBand(band?: string, score?: number): number {
  if (band === 'critical' || (typeof score === 'number' && score < 40)) return 3.6;
  if (band === 'stressed' || (typeof score === 'number' && score < 60)) return 2.8;
  if (band === 'watch' || (typeof score === 'number' && score < 80)) return 2.0;
  return 1.4; // Calm default
}

export const CityVitalRhythm: React.FC<CityVitalRhythmProps> = React.memo(
  ({ score = 85, band = 'calm', color = '#0891b2', theme = 'day', className = '' }) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Persistent animation state refs (no useState re-renders)
    const animFrameRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number | null>(null);
    const offsetRef = useRef<number>(0);

    // Dimension refs
    const dimensionsRef = useRef<{ width: number; height: number; dpr: number }>({
      width: 0,
      height: 0,
      dpr: 1,
    });

    // Theme ref to adapt grid lines without restarting
    const themeRef = useRef<string>(theme);
    useEffect(() => {
      themeRef.current = theme;
    }, [theme]);

    // Target vs Current Speed & Color interpolation state
    const currentSpeedRef = useRef<number>(calculateSpeedFromBand(band, score));
    const targetSpeedRef = useRef<number>(calculateSpeedFromBand(band, score));
    const startSpeedRef = useRef<number>(calculateSpeedFromBand(band, score));

    const currentColorRef = useRef<RGBColor>(parseColorToRGB(color));
    const targetColorRef = useRef<RGBColor>(parseColorToRGB(color));
    const startColorRef = useRef<RGBColor>(parseColorToRGB(color));

    const transitionStartTimeRef = useRef<number>(0);
    const isTransitioningRef = useRef<boolean>(false);

    // Props update sync: Smooth 1.5s blend when band/score/color changes
    useEffect(() => {
      const newTargetSpeed = calculateSpeedFromBand(band, score);
      const newTargetColor = parseColorToRGB(color);

      startSpeedRef.current = currentSpeedRef.current;
      targetSpeedRef.current = newTargetSpeed;

      startColorRef.current = { ...currentColorRef.current };
      targetColorRef.current = newTargetColor;

      transitionStartTimeRef.current = performance.now();
      isTransitioningRef.current = true;
    }, [band, score, color]);

    // Core Drawing Function
    const drawFrame = (now: number, ctx: CanvasRenderingContext2D) => {
      const { width, height, dpr } = dimensionsRef.current;
      if (width <= 0 || height <= 0) return;

      // 1. Smooth 1.5s parameter interpolation
      if (isTransitioningRef.current) {
        const elapsed = now - transitionStartTimeRef.current;
        const progress = Math.min(1, Math.max(0, elapsed / 1500)); // 1.5 seconds

        // Smooth ease-out quad curve
        const ease = progress * (2 - progress);

        currentSpeedRef.current =
          startSpeedRef.current + (targetSpeedRef.current - startSpeedRef.current) * ease;

        currentColorRef.current = {
          r: Math.round(startColorRef.current.r + (targetColorRef.current.r - startColorRef.current.r) * ease),
          g: Math.round(startColorRef.current.g + (targetColorRef.current.g - startColorRef.current.g) * ease),
          b: Math.round(startColorRef.current.b + (targetColorRef.current.b - startColorRef.current.b) * ease),
        };

        if (progress >= 1) {
          isTransitioningRef.current = false;
        }
      }

      const activeColor = currentColorRef.current;
      const strokeColorStr = `rgb(${activeColor.r}, ${activeColor.g}, ${activeColor.b})`;
      const isRaat = themeRef.current === 'raat';

      // Clear Canvas
      ctx.clearRect(0, 0, canvasRef.current?.width || width * dpr, canvasRef.current?.height || height * dpr);

      ctx.save();
      ctx.scale(dpr, dpr);

      // 2. Subtle background grid
      const gridSize = 16;
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = isRaat ? 'rgba(255, 209, 220, 0.08)' : 'rgba(8, 145, 178, 0.12)';

      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 3. Draw ECG Line
      const midY = height / 2;
      const wavePeriod = 160; // Distance between heartbeats in pixels

      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = strokeColorStr;

      // Soft Glow
      ctx.shadowColor = `rgba(${activeColor.r}, ${activeColor.g}, ${activeColor.b}, 0.6)`;
      ctx.shadowBlur = isRaat ? 8 : 4;

      ctx.beginPath();

      const offset = offsetRef.current;
      let lastY = midY;

      for (let x = 0; x <= width; x += 2) {
        const phase = (x + offset) % wavePeriod;
        let y = midY;

        // P Wave
        if (phase >= 25 && phase <= 40) {
          const pPhase = (phase - 25) / 15;
          y -= Math.sin(pPhase * Math.PI) * 7;
        }
        // Q Wave dip
        else if (phase >= 52 && phase < 56) {
          y += 5;
        }
        // R Wave main spike
        else if (phase >= 56 && phase <= 66) {
          const rPhase = (phase - 56) / 10;
          const amp = currentSpeedRef.current > 3.0 ? 38 : currentSpeedRef.current > 2.2 ? 32 : 26;
          y -= Math.sin(rPhase * Math.PI) * amp;
        }
        // S Wave deep dip
        else if (phase > 66 && phase <= 72) {
          y += currentSpeedRef.current > 3.0 ? 14 : 9;
        }
        // T Wave gentle recovery
        else if (phase >= 85 && phase <= 115) {
          const tPhase = (phase - 85) / 30;
          y -= Math.sin(tPhase * Math.PI) * 11;
        }

        lastY = y;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();

      // Lead pulse indicator dot
      ctx.beginPath();
      ctx.arc(width - 2, lastY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = strokeColorStr;
      ctx.fill();

      ctx.restore();
    };

    // Main Animation Effect (Runs ONCE on mount, NEVER restarts on props change)
    useEffect(() => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Check reduced motion
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // ResizeObserver to keep canvas crisp at exact DPR
      const handleResize = () => {
        if (!container || !canvas) return;
        const rect = container.getBoundingClientRect();
        const width = Math.floor(rect.width);
        const height = Math.floor(rect.height || 90);

        if (width <= 0 || height <= 0) return;

        const dpr = Math.max(1, window.devicePixelRatio || 1);

        dimensionsRef.current = { width, height, dpr };

        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        if (prefersReducedMotion) {
          drawFrame(performance.now(), ctx);
        }
      };

      const observer = new ResizeObserver(() => {
        handleResize();
      });
      observer.observe(container);
      handleResize();

      if (prefersReducedMotion) {
        return () => {
          observer.disconnect();
        };
      }

      // Single delta-time animation loop
      const loop = (timestamp: number) => {
        if (lastTimeRef.current === null) {
          lastTimeRef.current = timestamp;
        }

        // Calculate delta time in seconds, capped at 0.1s to prevent jumps on tab focus
        const dt = Math.min(0.1, (timestamp - lastTimeRef.current) / 1000);
        lastTimeRef.current = timestamp;

        // Advance offset based on delta time (60fps baseline multiplier)
        offsetRef.current = (offsetRef.current + currentSpeedRef.current * dt * 60) % 1600;

        drawFrame(timestamp, ctx);

        animFrameRef.current = requestAnimationFrame(loop);
      };

      // Start loop
      animFrameRef.current = requestAnimationFrame(loop);

      // Handle visibilitychange to pause when tab hidden & resume smoothly
      const handleVisibilityChange = () => {
        if (document.hidden) {
          if (animFrameRef.current !== null) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
          }
        } else {
          lastTimeRef.current = null;
          if (animFrameRef.current === null) {
            animFrameRef.current = requestAnimationFrame(loop);
          }
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        if (animFrameRef.current !== null) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        observer.disconnect();
      };
    }, []);

    return (
      <div
        ref={containerRef}
        className={`relative w-full h-[120px] flex items-center justify-center overflow-hidden ${className}`}
      >
        <canvas ref={canvasRef} className="block w-full h-full rounded" />
      </div>
    );
  }
);

CityVitalRhythm.displayName = 'CityVitalRhythm';
