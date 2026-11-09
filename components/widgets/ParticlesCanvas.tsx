import React, { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  r: number;
  dx: number;
  dy: number;
}

export const ParticlesCanvas: React.FC<{ color?: string }> = ({
  color = "rgba(255, 255, 255, 0.4)",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId: number = 0;
    let isVisible = !document.hidden;
    const particles: Particle[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      createParticles();
    };

    const createParticles = () => {
      particles.length = 0;
      const count = Math.min(45, Math.max(20, Math.floor(window.innerWidth / 35)));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 2 + 1,
          dx: (Math.random() - 0.5) * 0.35,
          dy: (Math.random() - 0.5) * 0.35,
        });
      }
    };

    const render = () => {
      if (!isVisible) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = color;

      ctx.beginPath();
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.dx;
        p.y += p.dy;

        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;

        ctx.moveTo(p.x + p.r, p.y);
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      }
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        cancelAnimationFrame(animId);
        animId = requestAnimationFrame(render);
      } else {
        cancelAnimationFrame(animId);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (isVisible) {
      animId = requestAnimationFrame(render);
    }

    return () => {
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      cancelAnimationFrame(animId);
    };
  }, [color]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
};