import { useState } from "react";
import type { GameState, ItemId, ToolSlot } from "../game/types";
import type { GameApi } from "../game/useGame";
import { ITEMS, SELL_RATIO } from "../game/data";
import { SKILLS, fmt, levelForXp, progressIntoLevel, totalLevel } from "../game/xp";
import { ItemIcon } from "./ItemIcon";

const SLOT_LABEL: Record<ToolSlot, string> = {
  weapon: "Weapon", axe: "Axe", pick: "Pickaxe", rod: "Fishing rod",
};

export function SidePanels({ api, g }: { api: GameApi; g: GameState }) {
  const [tab, setTab] = useState<"inv" | "skills" | "gear">("inv");

  return (
    <div className="flex h-full min-h-0 flex-col rounded-md border border-[#5c4a2a]/80 bg-[#171310]/95 shadow-[inset_0_0_24px_rgba(0,0,0,0.7)]">
      <div className="flex border-b border-[#3a2f1e]">
        {(
          [
            ["inv", "Inventory"],
            ["skills", "Skills"],
            ["gear", "Gear"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`font-display flex-1 py-2 text-[10.5px] font-bold tracking-[0.18em] transition-colors ${
              tab === id
                ? "border-b-2 border-[#d8b25c] bg-[#241c10] text-[#e8c876]"
                : "text-[#8a7a52] hover:bg-[#1d1610] hover:text-[#c8b070]"
            }`}
          >
            {label.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="chat-scroll min-h-0 flex-1 overflow-y-auto p-2">
        {tab === "inv" && <Inventory api={api} g={g} />}
        {tab === "skills" && <Skills g={g} />}
        {tab === "gear" && <Gear api={api} g={g} />}
      </div>
    </div>
  );
}

function Inventory({ api, g }: { api: GameApi; g: GameState }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between rounded-sm border border-[#3a2f1e] bg-[#0f0b08] px-2 py-1">
        <span className="text-[11px] text-[#8a7a52]">Purse</span>
        <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#f0c858]">
          <ItemIcon item="coins" size={16} />
          {fmt(g.coins)}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {g.inv.map((slot, i) => (
          <button
            key={i}
            onClick={() => api.clickInventorySlot(i)}
            onContextMenu={(e) => { e.preventDefault(); api.dropSlot(i); }}
            title={
              slot
                ? `${ITEMS[slot.item].name} — click to use, right-click to drop`
                : "Empty slot"
            }
            className={`group relative flex aspect-square items-center justify-center rounded-sm border transition-all ${
              slot
                ? "border-[#4a3a20] bg-gradient-to-b from-[#241c12] to-[#171008] hover:border-[#d8b25c] hover:shadow-[0_0_8px_rgba(216,178,92,0.35)] active:scale-95"
                : "border-[#2a2115] bg-[#120d08]"
            }`}
          >
            {slot && <ItemIcon item={slot.item} size={30} />}
            {slot && slot.n > 1 && (
              <span className="absolute bottom-0 right-0.5 text-[10px] font-bold text-[#f0e0b0] [text-shadow:0_1px_2px_#000]">
                {slot.n}
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[10.5px] leading-snug text-[#6a5a3a]">
        Click food to eat it and tools to wield them. Right-click drops.
      </p>
    </div>
  );
}

function Skills({ g }: { g: GameState }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between rounded-sm border border-[#3a2f1e] bg-[#0f0b08] px-2 py-1">
        <span className="font-display text-[10px] font-bold tracking-[0.2em] text-[#a8905a]">TOTAL LEVEL</span>
        <span className="font-display text-[15px] font-black text-[#e8c876]">{totalLevel(g.xp)}</span>
      </div>
      <div className="flex flex-col gap-1">
        {SKILLS.map((s) => {
          const lvl = levelForXp(g.xp[s.id]);
          const prog = progressIntoLevel(g.xp[s.id]);
          return (
            <div
              key={s.id}
              className={`rounded-sm border px-2 py-1.5 transition-colors ${
                s.impl
                  ? "border-[#3a2f1e] bg-[#1a140c] hover:border-[#5c4a2a]"
                  : "border-[#241c12] bg-[#120e09] opacity-45"
              }`}
              title={
                s.impl
                  ? `${s.name} — ${fmt(g.xp[s.id])} XP total · ${fmt(prog.cur)} / ${fmt(prog.next)} into level`
                  : "Arriving in a future update"
              }
            >
              <div className="flex items-center gap-2">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[12px]"
                  style={{ borderColor: s.color, background: "rgba(0,0,0,0.35)" }}
                >
                  {s.icon}
                </span>
                <span className={`flex-1 text-[12px] font-bold ${s.impl ? "text-[#e0d6c0]" : "text-[#8a7a52]"}`}>
                  {s.name}
                </span>
                {!s.impl && <span className="text-[9px] uppercase tracking-wider text-[#5a4c32]">soon</span>}
                <span className={`font-display w-7 text-right text-[14px] font-black ${s.impl ? "text-[#e8c876]" : "text-[#6a5a3a]"}`}>
                  {lvl}
                </span>
              </div>
              {s.impl && (
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#0c0906]">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${prog.pct * 100}%`, background: `linear-gradient(90deg, ${s.color}, #d8b25c)` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Gear({ api, g }: { api: GameApi; g: GameState }) {
  const slots: ToolSlot[] = ["weapon", "axe", "pick", "rod"];
  return (
    <div className="flex flex-col gap-1.5">
      {slots.map((slot) => {
        const id = g.equipped[slot] as ItemId | undefined;
        return (
          <button
            key={slot}
            onClick={() => id && api.unequip(slot)}
            title={id ? `${ITEMS[id].name} — click to unequip` : "Nothing wielded"}
            className={`flex items-center gap-2.5 rounded-sm border px-2.5 py-2 text-left transition-all ${
              id
                ? "border-[#4a3a20] bg-gradient-to-r from-[#241c12] to-[#171008] hover:border-[#d8b25c]"
                : "border-[#2a2115] bg-[#120d08]"
            }`}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-sm border border-[#3a2f1e] bg-[#0d0a07]">
              {id ? <ItemIcon item={id} size={26} /> : <span className="text-[14px] text-[#3a2f1e]">—</span>}
            </span>
            <span>
              <span className="block text-[10px] uppercase tracking-[0.16em] text-[#8a7a52]">{SLOT_LABEL[slot]}</span>
              <span className={`block text-[12.5px] font-bold ${id ? "text-[#e0d6c0]" : "text-[#4a3c24]"}`}>
                {id ? ITEMS[id].name : "Empty"}
              </span>
            </span>
          </button>
        );
      })}
      <div className="mt-1 rounded-sm border border-[#241c12] bg-[#0f0b08] px-2.5 py-2 text-[10.5px] leading-snug text-[#6a5a3a]">
        Better tools work faster. Bronze ×1, iron ×1.18, steel ×1.39, mithril ×1.67.
      </div>
      <div className="rounded-sm border border-[#241c12] bg-[#0f0b08] px-2.5 py-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#8a7a52]">Sell value modifier</span>
          <span className="font-bold text-[#c8b070]">{Math.round(SELL_RATIO * 100)}%</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px]">
          <span className="text-[#8a7a52]">Lifetime gathered</span>
          <span className="font-bold text-[#c8b070]">{fmt(g.counters.gathered)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px]">
          <span className="text-[#8a7a52]">Items crafted</span>
          <span className="font-bold text-[#c8b070]">{fmt(g.counters.made)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px]">
          <span className="text-[#8a7a52]">Foes defeated</span>
          <span className="font-bold text-[#c8b070]">{fmt(g.counters.kills)}</span>
        </div>
      </div>
    </div>
  );
}
