import React, { useEffect, useRef } from "react";

/**
 * A very soft rainbow haze that follows the pointer.
 *
 * Drawn on a single canvas rather than DOM nodes: one element, no layout work,
 * and the whole thing can be switched off in one place. It sits behind the page
 * content (z-index 0 against the site's own white backgrounds) and never
 * receives pointer events.
 *
 * It stays off for touch devices (there is no hover to follow), for users who
 * asked for reduced motion, and while the tab is hidden.
 */

interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  hue: number;
}

const MAX_PUFFS = 46;
/** Distance the pointer must travel before another puff is spawned. */
const SPAWN_DISTANCE = 26;

export default function CursorHaze() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const puffs: Puff[] = [];
    let lastX: number | null = null;
    let lastY: number | null = null;
    let hue = Math.random() * 360;
    let raf = 0;
    let idleFrames = 0;

    const spawn = (x: number, y: number) => {
      hue = (hue + 11) % 360;
      if (puffs.length >= MAX_PUFFS) puffs.shift();
      puffs.push({
        x,
        y,
        // A gentle upward drift, like smoke.
        vx: (Math.random() - 0.5) * 0.35,
        vy: -0.22 - Math.random() * 0.28,
        life: 0,
        maxLife: 90 + Math.random() * 50,
        radius: 46 + Math.random() * 46,
        hue,
      });
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const { clientX: x, clientY: y } = e;
      if (lastX === null || lastY === null) {
        lastX = x;
        lastY = y;
        return;
      }
      const dx = x - lastX;
      const dy = y - lastY;
      if (Math.hypot(dx, dy) < SPAWN_DISTANCE) return;
      lastX = x;
      lastY = y;
      idleFrames = 0;
      spawn(x, y);
      if (!raf) raf = requestAnimationFrame(draw);
    };

    function draw() {
      raf = 0;
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.life += 1;
        if (p.life >= p.maxLife) {
          puffs.splice(i, 1);
          continue;
        }
        p.x += p.vx;
        p.y += p.vy;
        p.vy *= 0.995;

        const t = p.life / p.maxLife;
        // Fade in quickly, then out slowly — no hard edges at either end.
        const fade = t < 0.18 ? t / 0.18 : 1 - (t - 0.18) / 0.82;
        const alpha = Math.max(0, fade) * 0.14;
        const radius = p.radius * (0.65 + t * 0.9);

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
        gradient.addColorStop(0, `hsla(${p.hue}, 85%, 78%, ${alpha})`);
        gradient.addColorStop(0.55, `hsla(${p.hue}, 85%, 82%, ${alpha * 0.45})`);
        gradient.addColorStop(1, `hsla(${p.hue}, 85%, 88%, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (puffs.length) {
        raf = requestAnimationFrame(draw);
      } else if (idleFrames++ < 2) {
        raf = requestAnimationFrame(draw);
      }
    }

    const onVisibility = () => {
      if (document.hidden) {
        puffs.length = 0;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        ctx.clearRect(0, 0, width, height);
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      // Sits above the page (sections are opaque white, so a canvas behind
      // them would be invisible) but blends by multiplying: it tints the white
      // areas and leaves artwork almost untouched.
      className="pointer-events-none fixed inset-0 z-30"
      style={{ mixBlendMode: "multiply" }}
    />
  );
}
