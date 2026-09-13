import { useEffect, useRef, useState } from "react";
import { snapshot, startAmbient, subscribeAmbient } from "@/lib/ambient";
import { useNotebookStore } from "@/lib/store";

type Leaf = {
  x: number;
  y: number;
  r: number;
  spin: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
};

const COLORS = ["#8a5a32", "#c4a35a", "#6b7c4a", "#8a3d45", "#b0603a", "#5c4d7a"];

export function BootLeaves({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefs = useNotebookStore((s) => s.prefs);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    void startAmbient(prefs.ambient ? prefs.ambientVolume : 0).then(() => {
      setBlocked(snapshot().blocked);
      setReady(true);
    });
    return subscribeAmbient((state) => setBlocked(state.blocked));
  }, [prefs.ambient, prefs.ambientVolume]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const surface: HTMLCanvasElement = canvasRef.current;
    const brush: CanvasRenderingContext2D = surface.getContext("2d") as CanvasRenderingContext2D;
    let w = 0;
    let h = 0;
    const leaves: Leaf[] = [];
    const energy = { value: 0 };
    const unsub = subscribeAmbient((state) => {
      energy.value = state.energy;
    });

    function resize() {
      w = surface.clientWidth;
      h = surface.clientHeight;
      surface.width = w * devicePixelRatio;
      surface.height = h * devicePixelRatio;
      brush.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function spawn(n: number) {
      for (let i = 0; i < n; i += 1) {
        leaves.push({
          x: Math.random() * w,
          y: -20 - Math.random() * 80,
          r: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 0.08,
          vx: (Math.random() - 0.5) * 1.4,
          vy: 0.6 + Math.random() * 1.4,
          size: 8 + Math.random() * 14,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        });
      }
    }
    spawn(28);

    let frame = 0;
    let raf = 0;
    const started = performance.now();
    const DURATION = 6200;

    function drawLeaf(leaf: Leaf) {
      brush.save();
      brush.translate(leaf.x, leaf.y);
      brush.rotate(leaf.r);
      brush.fillStyle = leaf.color;
      brush.beginPath();
      brush.ellipse(0, 0, leaf.size * 0.38, leaf.size, 0, 0, Math.PI * 2);
      brush.fill();
      brush.restore();
    }

    function tick(now: number) {
      const t = now - started;
      brush.clearRect(0, 0, w, h);
      if (energy.value > 0.18 && frame % 4 === 0) spawn(2);
      if (frame % 18 === 0) spawn(1);
      for (const leaf of leaves) {
        leaf.x += leaf.vx + Math.sin(leaf.r) * 0.4;
        leaf.y += leaf.vy;
        leaf.r += leaf.spin;
        if (leaf.y > h + 30) {
          leaf.y = -20;
          leaf.x = Math.random() * w;
        }
        drawLeaf(leaf);
      }
      frame += 1;
      if (t < DURATION) raf = requestAnimationFrame(tick);
      else onDone();
    }
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      unsub();
    };
  }, [onDone]);

  async function onSurface() {
    const state = snapshot();
    if (state.blocked) {
      await startAmbient(prefs.ambient ? prefs.ambientVolume : 0);
      return;
    }
    onDone();
  }

  return (
    <div className="boot-leaves" onClick={() => void onSurface()} role="presentation">
      <canvas ref={canvasRef} className="boot-leaves-canvas" />
      <div className="boot-leaves-copy">
        <p className="font-display text-4xl tracking-tight text-ink">Quire</p>
        <p className="mt-2 text-sm text-ink-muted">{ready && blocked ? "Click to hear the chimes" : "The desk is gathering"}</p>
      </div>
    </div>
  );
}
