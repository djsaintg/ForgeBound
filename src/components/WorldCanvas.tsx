import { useEffect, useRef } from "react";
import type { GameApi } from "../game/useGame";
import { clampCam, render, tileSize } from "../game/render";

export function WorldCanvas({ api }: { api: GameApi }) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const camRef = useRef({ x: -1, y: -1 });
    const dispRef = useRef({ x: -1, y: 0 });
    const facingRef = useRef(1);
    const lastXRef = useRef(0);
    const clicksRef = useRef<{ x: number; y: number; t0: number }[]>([]);
    const lastSigRef = useRef("");

    useEffect(() => {
        const wrap = wrapRef.current!;
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        let raf = 0;
        let last = performance.now();
        let w = 0, h = 0, dpr = 1;

        const resize = () => {
            dpr = Math.min(2, window.devicePixelRatio || 1);
            w = wrap.clientWidth;
            h = wrap.clientHeight;
            canvas.width = Math.max(1, Math.floor(w * dpr));
            canvas.height = Math.max(1, Math.floor(h * dpr));
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(wrap);

        const loop = (t: number) => {
            raf = requestAnimationFrame(loop);
            const dt = Math.min(64, t - last);
            last = t;
            const g = api.gref.current;
            if (!g || w === 0) return;

            api.update(dt, t);

            // re-render the React panels only when something visible changed
            const sig = JSON.stringify([
                g.inv, g.xp, g.coins, g.hp, g.equipped, g.bank,
                g.bankOpen, g.shopOpen, g.stationUI, g.settingsOpen, g.pendingStation,
                g.chat.length, g.levelUps.length, g.xpEvents.length, g.zoom, g.graphicsMode,
            ]);
            if (sig !== lastSigRef.current) {
                lastSigRef.current = sig;
                api.bump();
            }

            const zoom = g.zoom || 2.2;
            const effTile = tileSize(zoom);

            if (dispRef.current.x < 0) {
                dispRef.current = { x: g.x, y: g.y };
                camRef.current = { x: g.x * effTile + effTile / 2, y: g.y * effTile + effTile / 2 };
                lastXRef.current = g.x;
            }

            // smooth sub-tile follow
            const k = Math.min(1, dt / 130);
            dispRef.current.x += (g.x - dispRef.current.x) * k;
            dispRef.current.y += (g.y - dispRef.current.y) * k;
            if (g.x !== lastXRef.current) {
                facingRef.current = g.x > lastXRef.current ? 1 : -1;
                lastXRef.current = g.x;
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
                facing: facingRef.current,
            });
        };
        raf = requestAnimationFrame(loop);
        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
        };
    }, [api]);

    const onClick = (e: React.MouseEvent) => {
        const g = api.gref.current;
        const canvas = canvasRef.current;
        if (!g || !canvas) return;
        const rect = canvas.getBoundingClientRect();
        const offX = e.clientX - rect.left;
        const offY = e.clientY - rect.top;
        const effTile = tileSize(g.zoom);
        const wx = camRef.current.x - rect.width / 2 + offX;
        const wy = camRef.current.y - rect.height / 2 + offY;
        const tx = Math.floor(wx / effTile);
        const ty = Math.floor(wy / effTile);
        clicksRef.current.push({ x: tx, y: ty, t0: performance.now() });
        if (api.handleWorldClick(tx, ty) === "walk") api.clickGround(tx, ty);
        api.bump();
    };

    const onWheel = (e: React.WheelEvent) => {
        const g = api.gref.current;
        if (!g) return;
        api.setZoom(g.zoom + (e.deltaY < 0 ? 0.2 : -0.2));
    };

    return (
        <div ref={wrapRef} className="absolute inset-0 overflow-hidden">
            <canvas
                ref={canvasRef}
                onClick={onClick}
                onWheel={onWheel}
                onContextMenu={(e) => e.preventDefault()}
                className="block cursor-pointer select-none"
            />
        </div>
    );
}
