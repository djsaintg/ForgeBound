import { useEffect, useRef } from "react";
import type { GameApi } from "../game/useGame";
import { MAP_H, MAP_W, TILE, groundAt, objAt } from "../game/map";
import { ORE_COLORS } from "../game/render";

const SCALE = 3;
const MW = MAP_W * SCALE;
const MH = MAP_H * SCALE;

const GROUND_COLORS: Record<string, string> = {
  ".": "#33502c", ",": "#6a5434", "#": "#6b675e", "_": "#a8935a",
  b: "#7a4e28", "~": "#245d80",
};

export function Minimap({ api }: { api: GameApi }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const baseRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const base = document.createElement("canvas");
    base.width = MW;
    base.height = MH;
    const b = base.getContext("2d")!;
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        b.fillStyle = GROUND_COLORS[groundAt(x, y)] ?? "#33502c";
        b.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
        const ch = objAt(x, y);
        if (ch === "T" || ch === "O") {
          b.fillStyle = ch === "O" ? "#1d3318" : "#24401c";
          b.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
        } else if ("RSICG".includes(ch)) {
          b.fillStyle = ORE_COLORS[ch];
          b.fillRect(x * SCALE + 0.5, y * SCALE + 0.5, SCALE - 1, SCALE - 1);
        } else if ("FA*B".includes(ch)) {
          b.fillStyle = "#d8b25c";
          b.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
        } else if (ch === "M") {
          b.fillStyle = "#9a5ab8";
          b.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
        } else if (ch === "P") {
          b.fillStyle = "#e0b48c";
          b.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
        }
      }
    }
    baseRef.current = base;

    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const g = api.gref.current;
      if (!g || !baseRef.current) return;
      ctx.clearRect(0, 0, MW, MH);
      ctx.drawImage(baseRef.current, 0, 0);
      for (const e of g.enemies) {
        if (e.deathAt) continue;
        ctx.fillStyle =
          e.type === "goblin" ? "#7ac05a"
          : e.type === "brigand" ? "#c05a8a"
          : e.type === "cow" ? "#e8e2d2"
          : "#f0c858";
        ctx.fillRect((e.x / MAP_W) * MW, (e.y / MAP_H) * MH, SCALE, SCALE);
      }
      const px = (g.x / (MAP_W * TILE)) * MW;
      const py = (g.y / (MAP_H * TILE)) * MH;
      const pulse = 1 + Math.sin(t / 300) * 0.35;
      ctx.strokeStyle = "rgba(255,235,150,0.9)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px + SCALE / 2, py + SCALE / 2, 3.2 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.fillRect(px, py, SCALE, SCALE);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [api]);

  const onClick = (e: React.MouseEvent) => {
    const g = api.gref.current;
    const canvas = ref.current;
    if (!g || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const tx = Math.floor(((e.clientX - rect.left) / rect.width) * MAP_W);
    const ty = Math.floor(((e.clientY - rect.top) / rect.height) * MAP_H);
    if (api.handleWorldClick(tx, ty) === "walk") api.clickGround(tx, ty);
    api.bump();
  };

  return (
    <div className="pointer-events-auto rounded-md border-2 border-[#5c4a2a] bg-[#141008]/85 p-1 shadow-[0_4px_18px_rgba(0,0,0,0.6)]">
      <div className="mb-0.5 flex items-center justify-between px-0.5">
        <span className="font-display text-[9px] font-bold tracking-[0.14em] text-[#d8b25c]">FORGEBOUND</span>
        <span className="text-[9px] font-bold text-[#8a7a52]">N ▲</span>
      </div>
      <canvas
        ref={ref}
        width={MW}
        height={MH}
        onClick={onClick}
        className="block cursor-pointer rounded-sm"
        style={{ width: MW, height: MH, imageRendering: "pixelated" }}
      />
    </div>
  );
}
