import React, { useState } from "react";
import type { GameState, ItemId } from "../game/types";
import type { GameApi } from "../game/useGame";
import { ITEMS, RECIPES, SELL_RATIO, SHOP_STOCK, STATION_NAMES } from "../game/data";
import { SKILL_BY_ID, fmt, levelForXp } from "../game/xp";
import { ItemIcon } from "./ItemIcon";
import { sfx } from "../game/audio";
import { Monitor, RotateCcw, Save, Sparkles, Volume2, VolumeX, ZoomIn } from "lucide-react";

function Backdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
    return (
        <div
        className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
        onClick={onClose}
        style={{ animation: "fadeIn 0.15s ease-out" }}
        >
        <div
        onClick={(e) => e.stopPropagation()}
        className="rs-panel w-full max-w-xl"
        style={{ animation: "modalIn 0.18s ease-out" }}
        >
        {children}
        </div>
        </div>
    );
}

function Header({ title, onClose }: { title: string; onClose: () => void }) {
    return (
        <div className="flex items-center justify-between border-b border-[#3a2f1e] px-4 py-2.5">
        <h2 className="font-display text-[13px] font-bold tracking-[0.22em] text-[#e8c876]">{title}</h2>
        <button
        onClick={onClose}
        className="flex h-6 w-6 items-center justify-center rounded-sm border border-[#4a3a20] text-[12px] text-[#a8905a] transition-colors hover:border-[#d8b25c] hover:text-[#e8c876]"
        >
        ✕
        </button>
        </div>
    );
}

const countOf = (g: GameState, id: ItemId) =>
    g.inv.reduce((sum, s) => (s && s.item === id ? sum + s.n : sum), 0);

// ---------------------------------------------------------------- station --
export function StationModal({ api, g }: { api: GameApi; g: GameState }) {
    if (!g.stationUI) return null;
    const st = g.stationUI.station;
    const recipes = RECIPES.filter((r) => r.station === st);
    return (
        <Backdrop onClose={api.closeOverlays}>
        <Header title={STATION_NAMES[st].toUpperCase()} onClose={api.closeOverlays} />
        <div className="flex flex-col gap-1.5 p-3">
        {recipes.map((r) => {
            const lvl = levelForXp(g.xp[r.skill]);
            const locked = lvl < r.level;
            const missing = Object.entries(r.inputs).some(([id, n]) => countOf(g, id as ItemId) < (n ?? 0));
            return (
                <button
                key={r.id}
                disabled={locked}
                onClick={() => { api.startRecipe(r.id); api.closeOverlays(); }}
                className={`group flex items-center gap-2.5 rounded-sm border px-3 py-2 text-left transition-all ${
                    locked
                    ? "cursor-not-allowed border-[#241c12] bg-[#120e09] opacity-50"
                    : missing
                    ? "border-[#4a3a20] bg-[#1a140c] hover:border-[#8a6a2e]"
                    : "border-[#4a3a20] bg-[#1a140c] hover:border-[#d8b25c] hover:shadow-[0_0_10px_rgba(216,178,92,0.25)]"
                }`}
                >
                <ItemIcon item={r.output} size={30} />
                <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-bold text-[#e0d6c0]">{r.name}</span>
                <span className="flex flex-wrap items-center gap-x-2 text-[10.5px]">
                <span className={locked ? "text-[#ff8a72]" : "text-[#8a7a52]"}>
                Lvl {r.level} {SKILL_BY_ID[r.skill].name}
                </span>
                <span className="text-[#d8b25c]">+{r.xp} xp</span>
                {missing && !locked && <span className="text-[#ff8a72]">missing materials</span>}
                </span>
                </span>
                <span className="flex items-center gap-1">
                {Object.entries(r.inputs).map(([id, n]) => {
                    const have = countOf(g, id as ItemId);
                    const enough = have >= (n ?? 0);
                    return (
                        <span
                        key={id}
                        className={`flex items-center gap-0.5 rounded-sm border px-1 py-0.5 text-[10.5px] font-bold ${
                            enough ? "border-[#3a2f1e] text-[#c8b070]" : "border-[#5a2a1a] text-[#ff8a72]"
                        }`}
                        title={ITEMS[id as ItemId].name}
                        >
                        <ItemIcon item={id as ItemId} size={14} />
                        {have}/{n}
                        </span>
                    );
                })}
                </span>
                </button>
            );
        })}
        <p className="px-1 pt-1 text-[10.5px] text-[#6a5a3a]">
        Crafting repeats automatically until you run out of materials, fill your inventory, or click away.
        </p>
        </div>
        </Backdrop>
    );
}

// -------------------------------------------------------------------- bank --
export function BankModal({ api, g }: { api: GameApi; g: GameState }) {
    if (!g.bankOpen) return null;
    const bankItems = Object.entries(g.bank).filter(([, n]) => n && n > 0);
    const rows = Math.min(12, Math.max(6, Math.ceil(bankItems.length / 6) || 6));
    return (
        <Backdrop onClose={api.closeOverlays}>
        <Header title="BANK OF FORGEBOUND" onClose={api.closeOverlays} />
        <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">
            {/* Vault — fixed 6-column grid, grows a row at a time */}
            <div>
                <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7a52]">Banked</span>
                    <span className="text-[10.5px] text-[#6a5a3a]">{bankItems.length} stacks</span>
                </div>
                <div className="chat-scroll grid max-h-64 grid-cols-6 content-start gap-1.5 overflow-y-auto rounded-sm border border-[#3a2f1e] bg-[#0f0b08] p-1.5">
                    {Array.from({ length: rows * 6 }, (_, i) => {
                        const entry = bankItems[i];
                        if (!entry) {
                            return <div key={`e${i}`} className="aspect-square rounded-sm border border-dashed border-[#2a2115] bg-[#0c0906] opacity-40" />;
                        }
                        const [id, n] = entry;
                        const itemId = id as ItemId;
                        return (
                            <button
                                key={itemId}
                                onClick={() => api.withdraw(itemId)}
                                onContextMenu={(e) => { e.preventDefault(); api.withdrawStack(itemId); }}
                                className="flex aspect-square items-center justify-center rounded-sm border border-[#2a2115] bg-[#171008] transition-all hover:border-[#d8b25c]"
                                title={`${ITEMS[itemId].name} — click: 1 · right-click: all ${n}`}
                            >
                                <ItemIcon item={itemId} size={26} />
                                {n > 1 && (
                                    <span className="absolute bottom-0 right-0.5 text-[9px] font-bold text-[#f0e0b0] [text-shadow:0_1px_2px_#000]">{n}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
            {/* Pack side mirrors the inventory grid */}
            <div>
                <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7a52]">Inventory</span>
                    <button onClick={api.depositAll} className="bank-btn !px-2 !py-0.5">Deposit all</button>
                </div>
                <div className="chat-scroll grid max-h-64 grid-cols-4 content-start gap-1.5 overflow-y-auto rounded-sm border border-[#3a2f1e] bg-[#0f0b08] p-1.5">
                    {g.inv.map((s, i) =>
                        s && s.item !== "coins" ? (
                            <button
                                key={i}
                                onClick={() => api.depositSlot(i)}
                                className="relative flex aspect-square items-center justify-center rounded-sm border border-[#2a2115] bg-[#171008] transition-all hover:border-[#d8b25c]"
                                title={`Deposit ${ITEMS[s.item].name}`}
                            >
                                <ItemIcon item={s.item} size={26} />
                                {s.n > 1 && (
                                    <span className="absolute bottom-0 right-0.5 text-[9px] font-bold text-[#f0e0b0] [text-shadow:0_1px_2px_#000]">{s.n}</span>
                                )}
                            </button>
                        ) : (
                            <div key={i} className="aspect-square rounded-sm border border-dashed border-[#2a2115] bg-[#0c0906] opacity-40" />
                        )
                    )}
                </div>
            </div>
        </div>
        </Backdrop>
    );
}

// -------------------------------------------------------------------- shop --
export function ShopModal({ api, g }: { api: GameApi; g: GameState }) {
    if (!g.shopOpen) return null;
    return (
        <Backdrop onClose={api.closeOverlays}>
        <Header title="ROKA'S TRADING POST" onClose={api.closeOverlays} />
        <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">
            <div>
                <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7a52]">For sale</span>
                    <span className="flex items-center gap-1 text-[11.5px] font-bold text-[#f0c858]">
                        <ItemIcon item="coins" size={14} /> {fmt(g.coins)}
                    </span>
                </div>
                <div className="chat-scroll max-h-64 space-y-1 overflow-y-auto rounded-sm border border-[#3a2f1e] bg-[#0f0b08] p-1.5">
                    {SHOP_STOCK.map((id) => {
                        const def = ITEMS[id];
                        const can = g.coins >= def.price;
                        return (
                            <div key={id} className="flex items-center gap-2 rounded-sm border border-[#2a2115] bg-[#171008] px-2 py-1.5">
                                <ItemIcon item={id} size={22} />
                                <span className="flex-1 truncate text-[12px] font-bold text-[#e0d6c0]">{def.name}</span>
                                <span className="text-[11px] font-bold text-[#c8b070]">{def.price}</span>
                                <button disabled={!can} onClick={() => api.buy(id)} className={`bank-btn ${can ? "" : "opacity-40"}`}>Buy</button>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div>
                <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7a52]">Sell ({Math.round(SELL_RATIO * 100)}%)</span>
                </div>
                <div className="chat-scroll max-h-64 space-y-1 overflow-y-auto rounded-sm border border-[#3a2f1e] bg-[#0f0b08] p-1.5">
                    {g.inv.every((s) => s === null || s.item === "coins") && (
                        <p className="px-2 py-4 text-center text-[11.5px] text-[#5a4c32]">Nothing to sell.</p>
                    )}
                    {g.inv.map((s, i) =>
                        s && s.item !== "coins" ? (
                            <div key={i} className="flex items-center gap-2 rounded-sm border border-[#2a2115] bg-[#171008] px-2 py-1.5">
                                <ItemIcon item={s.item} size={20} />
                                <span className="flex-1 truncate text-[12px] font-bold text-[#e0d6c0]">{ITEMS[s.item].name}</span>
                                {s.n > 1 && <span className="text-[11px] text-[#c8b070]">×{s.n}</span>}
                                <span className="text-[11px] font-bold text-[#d8b25c]">
                                    +{Math.max(1, Math.floor(ITEMS[s.item].price * SELL_RATIO)) * s.n}
                                </span>
                                <button onClick={() => api.sellSlot(i)} className="bank-btn">Sell</button>
                            </div>
                        ) : null
                    )}
                </div>
            </div>
        </div>
        </Backdrop>
    );
}

// ---------------------------------------------------------------- settings --
export function SettingsModal({ api, g }: { api: GameApi; g: GameState }) {
    const [muted, setMuted] = useState(sfx.isMuted());
    if (!g.settingsOpen) return null;

    const toggleMute = () => {
        const nm = !muted;
        sfx.setMuted(nm);
        setMuted(nm);
    };

    return (
        <Backdrop onClose={api.closeOverlays}>
        <Header title="ENGINE SETTINGS" onClose={api.closeOverlays} />
        <div className="chat-scroll flex max-h-[70vh] flex-col gap-4 overflow-y-auto p-4">
            <div className="space-y-2.5 rounded-sm border border-[#3a2f1e] bg-[#14100a] p-3.5">
                <label className="font-display flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c8b070]">
                    <ZoomIn className="h-3.5 w-3.5 text-[#9fd8ef]" /> Camera field of view
                    <span className="ml-auto rounded-sm border border-[#4a3a20] bg-[#0c0906] px-2 font-mono text-[11px] text-[#e8c876]">{(g.zoom || 2.2).toFixed(1)}×</span>
                </label>
                <input
                    type="range" min="1.0" max="3.2" step="0.2"
                    value={g.zoom || 2.2}
                    onChange={(e) => api.setZoom(parseFloat(e.target.value))}
                    className="h-2 w-full cursor-pointer rounded bg-[#0c0906] accent-[#d8b25c]"
                />
                <div className="flex justify-between font-mono text-[9.5px] font-bold text-[#6a5a3a]">
                    <span>1.0× vista</span><span>2.2× default</span><span>3.2× close-up</span>
                </div>
            </div>

            <div className="space-y-2.5 rounded-sm border border-[#3a2f1e] bg-[#14100a] p-3.5">
                <label className="font-display flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c8b070]">
                    <Sparkles className="h-3.5 w-3.5 text-[#7ee06a]" /> Rendering engine
                </label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => g.graphicsMode !== "64bit" && api.toggleGraphicsMode()}
                        className={g.graphicsMode === "64bit" ? "btn-gold flex items-center justify-center gap-2 !py-2 text-[11px]" : "btn-ghost flex items-center justify-center gap-2 !py-2 text-[11px]"}
                    >
                        <Sparkles className="h-3.5 w-3.5" /> 64-bit
                    </button>
                    <button
                        onClick={() => g.graphicsMode === "64bit" && api.toggleGraphicsMode()}
                        className={g.graphicsMode === "8bit" ? "btn-gold flex items-center justify-center gap-2 !py-2 text-[11px]" : "btn-ghost flex items-center justify-center gap-2 !py-2 text-[11px]"}
                    >
                        <Monitor className="h-3.5 w-3.5" /> 8-bit
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-[#3a2f1e] pt-3.5">
                <button onClick={toggleMute} className="btn-ghost flex w-full items-center justify-center gap-2 !py-2.5 text-[11px]">
                    {muted ? <VolumeX className="h-3.5 w-3.5 text-[#ff8a72]" /> : <Volume2 className="h-3.5 w-3.5 text-[#7ee06a]" />}
                    WebAudio: {muted ? "Muted" : "Active"}
                </button>
                <button
                    onClick={() => { api.saveNow(); api.closeOverlays(); }}
                    className="btn-gold flex w-full items-center justify-center gap-2 !py-2.5 text-[11px]"
                >
                    <Save className="h-3.5 w-3.5" /> Save &amp; close
                </button>
                <button
                    onClick={() => {
                        if (window.confirm("Erase progress and begin anew?")) {
                            api.resetGame(g.name || "Adventurer");
                            api.closeOverlays();
                        }
                    }}
                    className="btn-ghost flex w-full items-center justify-center gap-2 !border-[#8a3a2a] !py-2 text-[11px] !text-[#ff8a72] hover:!bg-[#3a1814]"
                >
                    <RotateCcw className="h-3.5 w-3.5" /> Reset / new character
                </button>
            </div>
        </div>
        </Backdrop>
    );
}
