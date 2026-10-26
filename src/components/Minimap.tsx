import { useEffect, useRef, useState } from "react";
import type { GameApi } from "../game/useGame";
import { MAP_H, MAP_W, groundAt, objAt } from "../game/map";
import { ORE_COLORS } from "../game/render";

const SCALE = 3;
const MW = MAP_W * SCALE;
const MH = MAP_H * SCALE;

/** Minimap zoom steps; 1 shows the whole realm, higher follows the hero up close. */
const ZOOMS = [1, 1.5, 2, 3, 4];
const ZOOM_KEY = "forgebound-minimap-zoom";
const DEFAULT_ZOOM = 2;

function storedZoom(): number {
    try {
        const z = Number(localStorage.getItem(ZOOM_KEY));
        return ZOOMS.includes(z) ? z : DEFAULT_ZOOM;
    } catch {
        return DEFAULT_ZOOM;
    }
}

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
    const [zoom, setZoomState] = useState(storedZoom);
    const zoomRef = useRef(zoom);
    // Top-left tile of the current view, shared with click-to-travel
    const viewRef = useRef({ ox: 0, oy: 0 });

    const setZoom = (z: number) => {
        zoomRef.current = z;
        setZoomState(z);
        try { localStorage.setItem(ZOOM_KEY, String(z)); } catch { /* ignore */ }
    };
    const step = (d: number) => {
        const i = ZOOMS.indexOf(zoomRef.current) + d;
        if (i >= 0 && i < ZOOMS.length) setZoom(ZOOMS[i]);
    };

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

            // View window in tiles, centred on the hero and kept inside the map
            const z = zoomRef.current;
            const vw = MAP_W / z, vh = MAP_H / z;
            const ox = Math.max(0, Math.min(MAP_W - vw, g.x + 0.5 - vw / 2));
            const oy = Math.max(0, Math.min(MAP_H - vh, g.y + 0.5 - vh / 2));
            viewRef.current = { ox, oy };
            const tp = SCALE * z; // pixels per tile
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(baseRef.current, ox * SCALE, oy * SCALE, vw * SCALE, vh * SCALE, 0, 0, MW, MH);
            const pip = (x: number, y: number) => ctx.fillRect((Math.round(x) - ox) * tp, (Math.round(y) - oy) * tp, tp, tp);

            // livestock + hostile pips (v0.2.0 spec)
            ctx.fillStyle = "rgba(255,255,255,0.85)";
            for (const c of g.cows) {
                if (c.hp > 0) pip(c.x, c.y);
            }
            if (g.chickens) {
                ctx.fillStyle = "#ffe14a";
                for (const ch of g.chickens) {
                    if (ch.hp > 0) pip(ch.x, ch.y);
                }
            }
            if (g.goblins) {
                ctx.fillStyle = "#e05252";
                for (const gb of g.goblins) {
                    if (gb.hp > 0) pip(gb.x, gb.y);
                }
            }

            // player marker with pulse
            const px = (g.x - ox) * tp;
            const py = (g.y - oy) * tp;
            const pulse = 1 + Math.sin(t / 300) * 0.35;
            ctx.strokeStyle = "rgba(255,235,150,0.9)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(px + tp / 2, py + tp / 2, (2 + tp * 0.4) * pulse, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = "#fff";
            ctx.fillRect(px, py, tp, tp);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [api]);

    const onClick = (e: React.MouseEvent) => {
        const g = api.gref.current;
        const canvas = ref.current;
        if (!g || !canvas) return;
        const rect = canvas.getBoundingClientRect();
        const { ox, oy } = viewRef.current;
        const z = zoomRef.current;
        const tx = Math.floor(ox + ((e.clientX - rect.left) / rect.width) * (MAP_W / z));
        const ty = Math.floor(oy + ((e.clientY - rect.top) / rect.height) * (MAP_H / z));
        api.handleWorldClick(tx, ty);
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
                    onWheel={(e) => step(e.deltaY < 0 ? 1 : -1)}
                    title="Click to travel · scroll to zoom"
                    className="block cursor-pointer"
                    style={{ width: MW, height: MH }}
                />
                <span className="font-display absolute left-1/2 top-0.5 -translate-x-1/2 text-[9px] font-black text-[#f0c858] [text-shadow:0_1px_2px_#000]">
                    N
                </span>
            </div>
            <div className="mt-1 flex items-center justify-center gap-2">
                <ZoomButton label="−" title="Zoom the map out" disabled={zoom === ZOOMS[0]} onClick={() => step(-1)} />
                <span className="font-display text-[8px] font-bold tracking-[0.3em] text-[#8a7a52]">FORGEBOUND</span>
                <ZoomButton label="+" title="Zoom the map in" disabled={zoom === ZOOMS[ZOOMS.length - 1]} onClick={() => step(1)} />
            </div>
        </div>
    );
}

function ZoomButton({ label, title, disabled, onClick }: { label: string; title: string; disabled: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className="flex h-4 w-4 items-center justify-center rounded-sm border border-[#6a5420] bg-[#14100a]/90 text-[11px] font-bold leading-none text-[#f0c858] transition-colors hover:border-[#d8b25c] disabled:opacity-35"
        >
            {label}
        </button>
    );
}
