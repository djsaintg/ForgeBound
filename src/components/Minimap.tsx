import { useEffect, useRef } from "react";
import type { GameApi } from "../game/useGame";
import { MAP_H, MAP_W, groundAt, objAt } from "../game/map";
import { ORE_COLORS } from "../game/render";

const SCALE = 3;
const MW = MAP_W * SCALE;
const MH = MAP_H * SCALE;

const GROUND_COLORS: Record<string, string> = {
    ".": "#33502c",
    ",": "#6a5434",
    "#": "#6b675e",
    "_": "#a8935a",
    b: "#7a4e28",
    "~": "#245d80",
};

const OBJ_COLORS: Record<string, string> = {
    T: "#1e3a18",
    O: "#16300f",
    F: "#e07020",
    A: "#9aa0a8",
    B: "#e8c040",
    "*": "#ff9030",
    M: "#c060c0",
    P: "#6090e0",
    f: "#70c0e0",
    t: "#70c0e0",
    H: "#7a4a28",
    V: "#c04030",
    c: "#a87838",
    h: "#d8b050",
    "=": "#5a4a30",
};

export function Minimap({ api }: { api: GameApi }) {
    const ref = useRef<HTMLCanvasElement>(null);
    const baseRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        // Static terrain layer — drawn once, blitted every frame.
        const base = document.createElement("canvas");
        base.width = MW;
        base.height = MH;
        const b = base.getContext("2d")!;
        for (let y = 0; y < MAP_H; y++) {
            for (let x = 0; x < MAP_W; x++) {
                const gch = groundAt(x, y);
                b.fillStyle = GROUND_COLORS[gch] ?? "#222";
                b.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
                const och = objAt(x, y);
                if (och) {
                    b.fillStyle = ORE_COLORS[och] ?? OBJ_COLORS[och] ?? "#888";
                    b.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
                }
            }
        }
        baseRef.current = base;

        let raf = 0;
        const canvas = ref.current!;
        const ctx = canvas.getContext("2d")!;

        const loop = (t: number) => {
            raf = requestAnimationFrame(loop);
            const g = api.gref.current;
            if (!g || !baseRef.current) return;
            ctx.clearRect(0, 0, MW, MH);
            ctx.drawImage(baseRef.current, 0, 0);

            // livestock + hostile pips (v0.2.0 spec)
            ctx.fillStyle = "rgba(255,255,255,0.85)";
            for (const c of g.cows) {
                if (c.hp > 0) ctx.fillRect(Math.round(c.x) * SCALE, Math.round(c.y) * SCALE, SCALE, SCALE);
            }
            if (g.chickens) {
                ctx.fillStyle = "#ffe14a";
                for (const ch of g.chickens) {
                    if (ch.hp > 0) ctx.fillRect(Math.round(ch.x) * SCALE, Math.round(ch.y) * SCALE, SCALE, SCALE);
                }
            }
            if (g.goblins) {
                ctx.fillStyle = "#e05252";
                for (const gb of g.goblins) {
                    if (gb.hp > 0) ctx.fillRect(Math.round(gb.x) * SCALE, Math.round(gb.y) * SCALE, SCALE, SCALE);
                }
            }

            // player marker with pulse
            const px = (g.x / MAP_W) * MW;
            const py = (g.y / MAP_H) * MH;
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
        <div className="pointer-events-auto relative select-none">
            <div
                className="relative overflow-hidden rounded-full border-2 border-[#6a5420] shadow-[0_4px_18px_rgba(0,0,0,0.6)]"
                style={{ width: MW + 4, height: MH + 4 }}
            >
                <canvas
                    ref={ref}
                    width={MW}
                    height={MH}
                    onClick={onClick}
                    title="Click to travel"
                    className="block cursor-pointer"
                    style={{ width: MW, height: MH }}
                />
                <span className="font-display absolute left-1/2 top-0.5 -translate-x-1/2 text-[9px] font-black text-[#f0c858] [text-shadow:0_1px_2px_#000]">
                    N
                </span>
            </div>
            <div className="mt-1 text-center">
                <span className="font-display text-[8px] font-bold tracking-[0.3em] text-[#8a7a52]">FORGEBOUND</span>
            </div>
        </div>
    );
}
