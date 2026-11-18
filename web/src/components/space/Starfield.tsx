import { useEffect, useRef } from "react";
import { starfield, colors } from "../../design/tokens";
import { usePrefersReducedMotion, useIsTouch } from "../../lib/hooks";

/**
 * Fixed, full-screen starfield on a single 2D canvas (cheaper than WebGL for points).
 *  - 3 depth layers drift at different speeds and shift with the mouse (parallax)
 *  - stars twinkle gently; an occasional shooting star crosses the sky
 *  - pauses while the tab is hidden; reduced motion → one static frame, no shooting stars
 */

interface Star {
  x: number; // 0..1 of the canvas width
  y: number; // 0..1 of the canvas height
  r: number;
  phase: number;
  layer: number;
}

interface Shooting {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // seconds left
  total: number;
}

const SHOOTING_STAR_SECONDS = 0.9;
const SHOOTING_TAIL = 0.12; // tail length as a fraction of velocity per second

function random(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const isTouch = useIsTouch();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    const stars: Star[] = [];
    starfield.layers.forEach((layer, index) => {
      for (let i = 0; i < layer.count; i++) {
        stars.push({ x: Math.random(), y: Math.random(), r: random(layer.size[0], layer.size[1]), phase: random(0, Math.PI * 2), layer: index });
      }
    });

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // Mouse parallax target (−1..1), eased every frame
    const mouse = { x: 0, y: 0, ex: 0, ey: 0 };
    const onMove = (e: PointerEvent) => {
      mouse.x = (e.clientX / width) * 2 - 1;
      mouse.y = (e.clientY / height) * 2 - 1;
    };

    let shooting: Shooting | null = null;
    let nextShooting = random(...starfield.shootingStarEvery);
    let raf = 0;
    let last = performance.now();
    let time = 0;

    const draw = (dt: number) => {
      time += dt;
      ctx.clearRect(0, 0, width, height);
      mouse.ex += (mouse.x - mouse.ex) * Math.min(1, dt * 3);
      mouse.ey += (mouse.y - mouse.ey) * Math.min(1, dt * 3);
      const scroll = window.scrollY;

      for (const s of stars) {
        const layer = starfield.layers[s.layer];
        const depth = (s.layer + 1) / starfield.layers.length; // near layers move more
        // Slow horizontal drift, scroll parallax and mouse parallax
        let x = (s.x * width - time * layer.speed * 60 - mouse.ex * starfield.mouseParallax * depth) % width;
        if (x < 0) x += width;
        let y = (s.y * height - scroll * layer.speed * 2 - mouse.ey * starfield.mouseParallax * depth) % height;
        if (y < 0) y += height;
        const twinkle = reducedMotion ? 1 : 0.65 + 0.35 * Math.sin(time * starfield.twinkleSpeed + s.phase);
        ctx.globalAlpha = layer.alpha * twinkle;
        ctx.fillStyle = s.layer === 2 && s.phase < 0.5 ? colors.cyan.soft : colors.ink.DEFAULT;
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reducedMotion) {
        nextShooting -= dt;
        if (!shooting && nextShooting <= 0) {
          const speed = random(700, 1000);
          const angle = random(0.25, 0.5); // shallow downward diagonal
          shooting = { x: random(0.1, 0.7) * width, y: random(0.02, 0.35) * height, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: SHOOTING_STAR_SECONDS, total: SHOOTING_STAR_SECONDS };
          nextShooting = random(...starfield.shootingStarEvery);
        }
        if (shooting) {
          shooting.life -= dt;
          shooting.x += shooting.vx * dt;
          shooting.y += shooting.vy * dt;
          const fade = Math.max(0, shooting.life / shooting.total);
          const tailX = shooting.x - shooting.vx * SHOOTING_TAIL;
          const tailY = shooting.y - shooting.vy * SHOOTING_TAIL;
          const gradient = ctx.createLinearGradient(shooting.x, shooting.y, tailX, tailY);
          gradient.addColorStop(0, `rgba(232,236,246,${0.85 * fade})`);
          gradient.addColorStop(1, "rgba(232,236,246,0)");
          ctx.globalAlpha = 1;
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(shooting.x, shooting.y);
          ctx.lineTo(tailX, tailY);
          ctx.stroke();
          if (shooting.life <= 0) shooting = null;
        }
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); // clamp long gaps (e.g. after tab switch)
      last = now;
      draw(dt);
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const onVisibility = () => (document.hidden ? cancelAnimationFrame(raf) : start());

    window.addEventListener("resize", resize);
    if (reducedMotion) {
      draw(0); // one static frame
      window.addEventListener("resize", () => draw(0));
    } else {
      if (!isTouch) window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("visibilitychange", onVisibility);
      start();
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reducedMotion, isTouch]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
      <div className="nebula-bg absolute inset-0" />
      <canvas ref={canvasRef} className="absolute inset-0" />
      {/* Vignette keeps text readable at the edges */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_40%,transparent_55%,rgba(5,6,10,0.85))]" />
    </div>
  );
}
