import { useEffect, useRef, useState } from "react";
import { ritualThemeId, snapshot, startAmbient, subscribeAmbient } from "@/lib/ambient";
import { peekBoot } from "@/lib/boot-peek";
import { THEME_META } from "@/lib/theme";
import { useNotebookStore } from "@/lib/store";
import type { ThemeId } from "@/lib/types";

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
const DURATION = 6200;
const LEAVE_MS = 1150;
const REDUCED_MS = 1200;
const TAU = Math.PI * 2;

export function BootLeaves({ onDone, deskReady = true }: { onDone: () => void; deskReady?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefs = useNotebookStore((s) => s.prefs);
  const hasHydrated = useNotebookStore((s) => s.hasHydrated);
  const ritual = ritualThemeId(hasHydrated ? prefs.theme : peekBoot().theme);
  const [leaving, setLeaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [holding, setHolding] = useState(false);
  const [reduced] = useState(() => prefersReducedMotion() || peekBoot().bootLeaves === false);
  const leavingRef = useRef(false);
  const deskReadyRef = useRef(deskReady);
  deskReadyRef.current = deskReady;

  function beginLeave() {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setHolding(false);
    setLeaving(true);
    window.setTimeout(onDone, LEAVE_MS);
  }

  function maybeLeave() {
    if (leavingRef.current) return;
    if (!deskReadyRef.current) {
      setHolding(true);
      return;
    }
    beginLeave();
  }

  useEffect(() => {
    void startAmbient(prefs.ambient ? prefs.ambientVolume : 0, prefs.theme).then(() => {
      setBlocked(snapshot().blocked);
      setReady(true);
    });
    return subscribeAmbient((state) => setBlocked(state.blocked));
  }, [prefs.ambient, prefs.ambientVolume, prefs.theme]);

  useEffect(() => {
    function skip() {
      maybeLeave();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        maybeLeave();
      }
    }
    window.addEventListener("quire-boot-skip", skip);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("quire-boot-skip", skip);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const surface: HTMLCanvasElement = canvasRef.current;
    const brush: CanvasRenderingContext2D = surface.getContext("2d") as CanvasRenderingContext2D;
    let w = 0;
    let h = 0;
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

    if (reduced) {
      paintRitual(brush, ritual, w, h, DURATION * 0.72, 0, true);
      const id = window.setTimeout(maybeLeave, REDUCED_MS);
      return () => {
        window.clearTimeout(id);
        window.removeEventListener("resize", resize);
        unsub();
      };
    }

    const leaves: Leaf[] = [];
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
    if (ritual === "leather") spawn(28);

    let frame = 0;
    let raf = 0;
    const started = performance.now();

    function tick(now: number) {
      const t = now - started;
      if (ritual === "leather") {
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
          drawLeaf(brush, leaf);
        }
      } else {
        paintRitual(brush, ritual, w, h, t, energy.value, false);
      }
      frame += 1;
      if (t < DURATION) raf = requestAnimationFrame(tick);
      else maybeLeave();
    }
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      unsub();
    };
  }, [onDone, ritual, reduced]);

  async function onSurface() {
    const state = snapshot();
    if (state.blocked) {
      await startAmbient(prefs.ambient ? prefs.ambientVolume : 0, prefs.theme);
      return;
    }
    maybeLeave();
  }

  useEffect(() => {
    if (deskReady && holding) beginLeave();
  }, [deskReady, holding]);

  useEffect(() => {
    if (deskReady && prefs.bootLeaves === false) beginLeave();
  }, [deskReady, prefs.bootLeaves]);

  const tagline =
    ready && blocked
      ? "Click to hear the room"
      : holding
        ? "Opening the desk"
        : reduced
          ? ""
          : THEME_META[ritual].gathering;

  return (
    <div
      className={leaving ? "boot-ritual boot-leaves is-leaving" : "boot-ritual boot-leaves"}
      data-ritual={ritual}
      onClick={() => void onSurface()}
      role="presentation"
    >
      <canvas ref={canvasRef} className="boot-ritual-canvas boot-leaves-canvas" />
      <div className="boot-ritual-copy boot-leaves-copy">
        <p className="font-display text-4xl tracking-tight text-ink">Quire</p>
        {tagline ? <p className="mt-2 text-sm text-ink-muted">{tagline}</p> : null}
      </div>
    </div>
  );
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function easeOutBack(t: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const x = Math.min(1, Math.max(0, t));
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
}

function paintRitual(
  brush: CanvasRenderingContext2D,
  ritual: ThemeId,
  w: number,
  h: number,
  t: number,
  energy: number,
  still: boolean,
) {
  if (ritual === "navy") drawNavy(brush, w, h, t, energy, still);
  else if (ritual === "dark") drawDark(brush, w, h, t, still);
  else if (ritual === "light") drawLight(brush, w, h, t, still);
  else drawLeatherStill(brush, w, h);
}

function drawLeaf(brush: CanvasRenderingContext2D, leaf: Leaf) {
  brush.save();
  brush.translate(leaf.x, leaf.y);
  brush.rotate(leaf.r);
  brush.fillStyle = leaf.color;
  brush.beginPath();
  brush.ellipse(0, 0, leaf.size * 0.38, leaf.size, 0, 0, TAU);
  brush.fill();
  brush.restore();
}

function drawLeatherStill(brush: CanvasRenderingContext2D, w: number, h: number) {
  brush.clearRect(0, 0, w, h);
  for (let i = 0; i < 22; i += 1) {
    drawLeaf(brush, {
      x: ((i * 97) % w) + 20,
      y: ((i * 53) % h) * 0.7 + 40,
      r: i * 0.4,
      spin: 0,
      vx: 0,
      vy: 0,
      size: 10 + (i % 5) * 2,
      color: COLORS[i % COLORS.length],
    });
  }
}

function drawNavy(
  brush: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  energy: number,
  still: boolean,
) {
  brush.fillStyle = "#0a1220";
  brush.fillRect(0, 0, w, h);
  const washX = still ? w * 0.28 : ((t / DURATION) * (w + w * 0.55) - w * 0.35);
  const wash = brush.createLinearGradient(washX, 0, washX + w * 0.5, h * 0.15);
  wash.addColorStop(0, "rgba(142,180,220,0)");
  wash.addColorStop(0.45, "rgba(142,180,220,0.16)");
  wash.addColorStop(0.72, "rgba(232,238,246,0.1)");
  wash.addColorStop(1, "rgba(18,32,56,0)");
  brush.fillStyle = wash;
  brush.fillRect(0, 0, w, h);

  for (let i = 0; i < 5; i += 1) {
    const base = h * 0.42 + i * h * 0.09;
    const phase = still ? i * 0.7 : t * 0.0014 + i * 0.9;
    brush.beginPath();
    brush.moveTo(0, h);
    for (let x = 0; x <= w; x += 10) {
      const y =
        base +
        Math.sin(x * 0.01 + phase) * (16 + i * 3) +
        Math.sin(x * 0.028 + phase * 1.35) * 7;
      brush.lineTo(x, y);
    }
    brush.lineTo(w, h);
    brush.closePath();
    brush.fillStyle = i % 2 === 0 ? "rgba(142,180,220,0.1)" : "rgba(232,238,246,0.06)";
    brush.fill();
  }

  if (energy > 0.1 || still) {
    brush.fillStyle = `rgba(232,238,246,${0.14 + energy * 0.35})`;
    for (let i = 0; i < 18; i += 1) {
      const x = ((t * 0.04 + i * 73) % w) + Math.sin(i) * 12;
      const y = h * 0.55 + ((i * 37) % (h * 0.32));
      brush.beginPath();
      brush.arc(x, y, 1.1 + (i % 3) * 0.4, 0, TAU);
      brush.fill();
    }
  }

  brush.strokeStyle = "rgba(232,238,246,0.28)";
  brush.lineWidth = 1.2;
  brush.lineCap = "round";
  const gulls = [
    { x: still ? w * 0.22 : ((t * 0.018) % (w + 80)) - 40, y: h * 0.22, s: 1 },
    { x: still ? w * 0.7 : w - ((t * 0.012) % (w + 60)) + 20, y: h * 0.3, s: 0.7 },
  ];
  for (const gull of gulls) {
    brush.beginPath();
    brush.moveTo(gull.x - 11 * gull.s, gull.y);
    brush.quadraticCurveTo(gull.x - 5 * gull.s, gull.y - 6 * gull.s, gull.x, gull.y + 1);
    brush.quadraticCurveTo(gull.x + 5 * gull.s, gull.y - 6 * gull.s, gull.x + 11 * gull.s, gull.y);
    brush.stroke();
  }
}

function drawDark(brush: CanvasRenderingContext2D, w: number, h: number, t: number, still: boolean) {
  brush.fillStyle = "#0c0b0a";
  brush.fillRect(0, 0, w, h);
  for (let i = 0; i < 42; i += 1) {
    const x = ((i * 137) % w) + 8;
    const y = ((i * 89) % Math.floor(h * 0.7)) + 10;
    const twinkle = still ? 0.35 : 0.22 + 0.2 * Math.sin(t * 0.002 + i);
    brush.fillStyle = `rgba(236,230,220,${twinkle})`;
    brush.beginPath();
    brush.arc(x, y, i % 7 === 0 ? 1.3 : 0.7, 0, TAU);
    brush.fill();
  }

  const mx = w * 0.52;
  const my = h * 0.26;
  const r = Math.min(w, h) * 0.09;
  const halo = brush.createRadialGradient(mx, my, r * 0.35, mx, my, r * 2.5);
  halo.addColorStop(0, "rgba(236,230,220,0.38)");
  halo.addColorStop(0.45, "rgba(236,230,220,0.1)");
  halo.addColorStop(1, "rgba(236,230,220,0)");
  brush.fillStyle = halo;
  brush.beginPath();
  brush.arc(mx, my, r * 2.5, 0, TAU);
  brush.fill();
  brush.fillStyle = "#ece6dc";
  brush.beginPath();
  brush.arc(mx, my, r, 0, TAU);
  brush.fill();
  brush.fillStyle = "rgba(26,23,20,0.08)";
  brush.beginPath();
  brush.arc(mx - r * 0.28, my + r * 0.12, r * 0.18, 0, TAU);
  brush.fill();
  brush.beginPath();
  brush.arc(mx + r * 0.22, my - r * 0.2, r * 0.1, 0, TAU);
  brush.fill();

  const progress = still ? 0.48 : Math.min(1, t / 5400);
  const ox = -40 + progress * (w + 80);
  const oy = my + r + 36 + Math.sin(progress * Math.PI) * 10;
  const flap = still ? 0.15 : Math.sin(t * 0.012) * 0.45;
  drawOwl(brush, ox, oy, flap);
}

function drawOwl(brush: CanvasRenderingContext2D, x: number, y: number, flap: number) {
  brush.save();
  brush.translate(x, y);
  brush.fillStyle = "rgba(18, 14, 12, 0.94)";
  brush.beginPath();
  brush.ellipse(0, 6, 9, 13, 0, 0, TAU);
  brush.fill();
  brush.beginPath();
  brush.ellipse(0, -8, 8, 7.2, 0, 0, TAU);
  brush.fill();
  brush.beginPath();
  brush.moveTo(-6.5, -12);
  brush.lineTo(-10, -19);
  brush.lineTo(-2.5, -13);
  brush.moveTo(6.5, -12);
  brush.lineTo(10, -19);
  brush.lineTo(2.5, -13);
  brush.fill();
  brush.save();
  brush.rotate(-0.4 - flap);
  brush.beginPath();
  brush.ellipse(-8, 5, 15, 5.2, 0.15, 0, TAU);
  brush.fill();
  brush.restore();
  brush.save();
  brush.rotate(0.4 + flap);
  brush.beginPath();
  brush.ellipse(8, 5, 15, 5.2, -0.15, 0, TAU);
  brush.fill();
  brush.restore();
  brush.restore();
}

function drawLight(brush: CanvasRenderingContext2D, w: number, h: number, t: number, still: boolean) {
  brush.fillStyle = "#f3eee6";
  brush.fillRect(0, 0, w, h);
  const arrive = still ? 1 : easeOutBack(Math.min(1, t / 2500));
  const x = w * 0.5 + (1 - arrive) * w * 0.08;
  const y = h * 0.54 + (1 - arrive) * h * 0.42;
  const scale = 0.92 + arrive * 0.08;
  drawBreakfast(brush, x, y, scale);
  if (!still && t > 900) {
    const steamT = t - 900;
    drawSteam(brush, x + 38 * scale, y - 36 * scale, steamT, scale);
  }
}

function drawBreakfast(brush: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  brush.save();
  brush.translate(x, y);
  brush.scale(scale, scale);
  brush.fillStyle = "rgba(36,31,28,0.08)";
  brush.beginPath();
  brush.ellipse(4, 28, 84, 14, 0, 0, TAU);
  brush.fill();
  brush.fillStyle = "#e7dfd2";
  brush.beginPath();
  brush.ellipse(0, 18, 80, 24, 0, 0, TAU);
  brush.fill();
  brush.strokeStyle = "rgba(28,25,23,0.12)";
  brush.lineWidth = 1;
  brush.beginPath();
  brush.ellipse(0, 18, 64, 16, 0, 0, TAU);
  brush.stroke();

  brush.fillStyle = "#b08950";
  brush.beginPath();
  brush.ellipse(-22, 6, 32, 23, -0.16, 0, TAU);
  brush.fill();
  brush.fillStyle = "#e2c48a";
  brush.beginPath();
  brush.ellipse(-22, 6, 22, 15, -0.16, 0, TAU);
  brush.fill();
  brush.fillStyle = "#f3eee6";
  brush.beginPath();
  brush.ellipse(-22, 6, 10, 7, -0.16, 0, TAU);
  brush.fill();
  brush.fillStyle = "#5c4030";
  for (let i = 0; i < 9; i += 1) {
    const a = i * 0.7;
    brush.beginPath();
    brush.ellipse(-22 + Math.cos(a) * 18, 6 + Math.sin(a) * 12, 1.1, 0.6, a, 0, TAU);
    brush.fill();
  }

  brush.fillStyle = "#f7f1e6";
  roundRect(brush, 24, -30, 30, 38, 8);
  brush.fill();
  brush.fillStyle = "#231710";
  brush.beginPath();
  brush.ellipse(39, -24, 12, 5, 0, 0, TAU);
  brush.fill();
  brush.strokeStyle = "#efe6d6";
  brush.lineWidth = 3.4;
  brush.beginPath();
  brush.arc(56, -8, 9, -0.85, 0.9);
  brush.stroke();
  brush.restore();
}

function drawSteam(brush: CanvasRenderingContext2D, x: number, y: number, t: number, scale: number) {
  for (let i = 0; i < 3; i += 1) {
    const rise = ((t * 0.018 + i * 18) % 46) * scale;
    const wobble = Math.sin(t * 0.003 + i * 1.4) * 7 * scale;
    brush.strokeStyle = `rgba(36,31,28,${0.16 - rise / 280})`;
    brush.lineWidth = 1.4;
    brush.beginPath();
    brush.moveTo(x + i * 5, y);
    brush.bezierCurveTo(x + wobble + i * 4, y - rise * 0.4, x - wobble, y - rise * 0.75, x + wobble * 0.4, y - rise);
    brush.stroke();
  }
}

function roundRect(brush: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  brush.beginPath();
  brush.moveTo(x + r, y);
  brush.arcTo(x + w, y, x + w, y + h, r);
  brush.arcTo(x + w, y + h, x, y + h, r);
  brush.arcTo(x, y + h, x, y, r);
  brush.arcTo(x, y, x + w, y, r);
  brush.closePath();
}
