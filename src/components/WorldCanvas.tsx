import { useEffect, useRef } from "react";
import type { GameApi } from "../game/useGame";
import { clampCam, render, tileSize } from "../game/render";
import type { GameState } from "../game/types";
import { dirFrom, type Dir } from "../game/figure";
import { ITEMS } from "../game/data";
import { ItemIcon } from "./ItemIcon";
import { useContextMenu, useLongPress } from "./ContextMenu";

// Cheap FNV-1a hash over the state the React panels display. Runs every
// frame, so it walks the fields directly instead of JSON.stringify-ing them
// (which allocated a multi-KB string 60×/s).
function uiSignature(g: GameState): number {
    let h = 0x811c9dc5;
    const num = (n: number) => { h = Math.imul(h ^ ((n * 1000) | 0), 16777619); };
    const str = (s: string) => { for (let i = 0; i < s.length; i++) num(s.charCodeAt(i)); num(-1); };
    const rec = (r: Record<string, number | string | undefined>) => {
        for (const k in r) { str(k); const v = r[k]; if (typeof v === "number") num(v); else if (v) str(v); }
        num(-2);
    };

    for (const s of g.inv) { if (s) { str(s.item); num(s.n); } else num(-3); }
    rec(g.xp);
    rec(g.bank);
    rec(g.equipped);
    num(g.coins); num(g.hp); num(g.zoom); str(g.graphicsMode);
    num(+g.bankOpen); num(+g.shopOpen); num(+g.settingsOpen);
    num(g.selected ?? -7); str(g.guide ?? "");
    num(Math.ceil(g.prayer)); num(-8); for (const b of g.blessings) str(b);
    if (g.dialogue) { num(g.dialogue.id); num(g.dialogue.page); } else num(-9);
    for (const k in g.quests) { const q = g.quests[k as keyof typeof g.quests]!; str(k); num(q.step); num(q.count); num(+q.done); }
    str(g.supply ?? ""); rec(g.supplyDay);
    if (g.stationUI) { str(g.stationUI.station); num(g.stationUI.x); num(g.stationUI.y); } else num(-4);
    if (g.pendingStation) { str(g.pendingStation.kind); num(g.pendingStation.x); num(g.pendingStation.y); } else num(-5);
    // The log is capped at 90 entries, so key it by the newest id, not length.
    num(g.chat.length ? g.chat[g.chat.length - 1].id : -6);
    num(g.levelUps.length);
    num(g.xpEvents.length);
    if (g.xpEvents.length) { num(g.xpEvents[0].id); num(g.xpEvents[g.xpEvents.length - 1].id); }
    return h;
}

export function WorldCanvas({ api }: { api: GameApi }) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const camRef = useRef({ x: -1, y: -1 });
    const dispRef = useRef({ x: -1, y: 0 });
    const dirRef = useRef<Dir>("down");
    const lastPosRef = useRef({ x: 0, y: 0 });
    const clicksRef = useRef<{ x: number; y: number; t0: number }[]>([]);
    const lastSigRef = useRef(0);

    useEffect(() => {
        const wrap = wrapRef.current!;
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        let raf = 0;
        let last = performance.now();
        let w = 0, h = 0, dpr = 0;

        // Assigning canvas.width/height wipes the canvas, so only touch it when the
        // size really changed — and repaint straight away so dragging a panel
        // edge never shows a blank frame.
        const resize = () => {
            const nd = Math.min(2, window.devicePixelRatio || 1);
            const nw = wrap.clientWidth;
            const nh = wrap.clientHeight;
            if (nw === w && nh === h && nd === dpr) return;
            dpr = nd; w = nw; h = nh;
            canvas.width = Math.max(1, Math.floor(w * dpr));
            canvas.height = Math.max(1, Math.floor(h * dpr));
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            paint(performance.now(), 0);
        };

        // Camera follow + draw; dt 0 repaints the current frame without advancing it.
        const paint = (t: number, dt: number) => {
            const g = api.gref.current;
            if (!g || w === 0) return;
            const zoom = g.zoom || 2.2;
            const effTile = tileSize(zoom);

            if (dispRef.current.x < 0) {
                dispRef.current = { x: g.x, y: g.y };
                camRef.current = { x: g.x * effTile + effTile / 2, y: g.y * effTile + effTile / 2 };
                lastPosRef.current = { x: g.x, y: g.y };
            }

            // smooth sub-tile follow
            const k = Math.min(1, dt / 130);
            dispRef.current.x += (g.x - dispRef.current.x) * k;
            dispRef.current.y += (g.y - dispRef.current.y) * k;
            // Face the way the last step went: up, down, left or right
            const last = lastPosRef.current;
            if (g.x !== last.x || g.y !== last.y) {
                dirRef.current = dirFrom(g.x - last.x, g.y - last.y, dirRef.current);
                lastPosRef.current = { x: g.x, y: g.y };
            }

            const target = clampCam(
                { x: dispRef.current.x * effTile + effTile / 2, y: dispRef.current.y * effTile + effTile / 2 },
                w, h, zoom
            );
            camRef.current = target;

            clicksRef.current = clicksRef.current.filter((c) => t - c.t0 < 620);

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            render(ctx, g, camRef.current, clicksRef.current, w, h, t, {
                dx: dispRef.current.x,
                dy: dispRef.current.y,
                dir: dirRef.current,
            });
        };

        const loop = (t: number) => {
            raf = requestAnimationFrame(loop);
            const dt = Math.min(64, t - last);
            last = t;
            const g = api.gref.current;
            if (!g || w === 0) return;

            api.update(dt, t);

            // re-render the React panels only when something visible changed
            const sig = uiSignature(g);
            if (sig !== lastSigRef.current) {
                lastSigRef.current = sig;
                api.bump();
            }

            paint(t, dt);
        };

        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(wrap);
        raf = requestAnimationFrame(loop);
        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
        };
    }, [api]);

    const openMenu = useContextMenu();
    const heldRef = useRef<HTMLDivElement>(null);

    /** The map tile under a screen point. */
    const tileAt = (clientX: number, clientY: number) => {
        const g = api.gref.current!;
        const rect = canvasRef.current!.getBoundingClientRect();
        const effTile = tileSize(g.zoom);
        const wx = camRef.current.x - rect.width / 2 + (clientX - rect.left);
        const wy = camRef.current.y - rect.height / 2 + (clientY - rect.top);
        return { tx: Math.floor(wx / effTile), ty: Math.floor(wy / effTile) };
    };

    const showMenu = (clientX: number, clientY: number) => {
        if (!api.gref.current || !canvasRef.current) return;
        const { tx, ty } = tileAt(clientX, clientY);
        openMenu(clientX, clientY, api.worldActions(tx, ty));
    };
    const press = useLongPress(showMenu);

    const onClick = (e: React.MouseEvent) => {
        if (!api.gref.current || !canvasRef.current || press.fired()) return;
        const { tx, ty } = tileAt(e.clientX, e.clientY);
        clicksRef.current.push({ x: tx, y: ty, t0: performance.now() });
        api.handleWorldClick(tx, ty);
        api.bump();
    };

    const onContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        showMenu(e.clientX, e.clientY);
    };

    // The held item follows the cursor; moved directly so it never re-renders React
    const onMouseMove = (e: React.MouseEvent) => {
        const el = heldRef.current;
        const wrap = wrapRef.current;
        if (!el || !wrap) return;
        const r = wrap.getBoundingClientRect();
        el.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 12}px)`;
    };

    const onWheel = (e: React.WheelEvent) => {
        const g = api.gref.current;
        if (!g) return;
        api.setZoom(g.zoom + (e.deltaY < 0 ? 0.2 : -0.2));
    };

    const g = api.gref.current;
    const held = g && g.selected !== null ? g.inv[g.selected] : null;

    return (
        <div ref={wrapRef} className="absolute inset-0 overflow-hidden" onMouseMove={onMouseMove}>
            <canvas
                ref={canvasRef}
                onClick={onClick}
                onWheel={onWheel}
                onContextMenu={onContextMenu}
                {...press.handlers}
                className={`block select-none ${held ? "cursor-crosshair" : "cursor-pointer"}`}
            />
            {held && (
                <>
                    <div ref={heldRef} className="pointer-events-none absolute left-0 top-0 opacity-90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        <ItemIcon item={held.item} size={26} />
                    </div>
                    <div className="pointer-events-none absolute left-2.5 top-2.5 rounded-sm border border-[#6a5428] bg-[#14100a]/90 px-2.5 py-1 text-[11.5px] text-[#e0d6c0] shadow-[0_2px_10px_rgba(0,0,0,0.6)]">
                        Use <span className="font-bold text-[#f0c858]">{ITEMS[held.item].name}</span> on… <span className="text-[#8a7a52]">(Esc to cancel)</span>
                    </div>
                </>
            )}
        </div>
    );
}
