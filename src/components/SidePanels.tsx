import { Fragment, useRef, useState } from "react";
import type { GameState, ItemId, MenuOption, ToolSlot } from "../game/types";
import type { GameApi } from "../game/useGame";
import { BLESSINGS, BLESSING_BY_ID, ITEMS, SELL_RATIO, SUPPLY_RUNS } from "../game/data";
import { NPC_NAME, QUESTS } from "../game/quests";
import { SKILLS, fmt, levelForXp, progressIntoLevel, totalLevel } from "../game/xp";
import { ItemIcon } from "./ItemIcon";
import { useContextMenu, useLongPress } from "./ContextMenu";
import { SLOT_MIME, slotDragProps, useTouchSlotDrag } from "./SlotDrag";
import { ResizeHandle } from "./ResizeHandle";
import { TAB_LABEL, dockTab, resetLayout, selectTab, setPaneHeight, usePaneLayout, type Pane, type TabId } from "./paneLayout";

const SLOT_LABEL: Record<ToolSlot, string> = {
  weapon: "Weapon", axe: "Axe", pick: "Pickaxe", rod: "Fishing rod", armor: "Armor",
};

/** dataTransfer type for a side-panel tab being dragged to another pane. */
const TAB_MIME = "application/x-forgebound-tab";

/**
 * The docked side column: one or more panes stacked top to bottom, each with
 * its own tabs. Drag a tab onto another pane's tab bar to group it there, or
 * onto the top / bottom half of a pane to dock it above / below. Right-click
 * (or long-press) a tab for the same moves.
 */
export function SidePanels({ api, g }: { api: GameApi; g: GameState }) {
  const panes = usePaneLayout();
  const [dragTab, setDragTab] = useState<TabId | null>(null);
  const colRef = useRef<HTMLDivElement>(null);
  const paneRefs = useRef<(HTMLDivElement | null)[]>([]);

  const maxHeight = (i: number) => {
    const total = colRef.current?.clientHeight ?? 600;
    return Math.max(MIN_PANE, total - (panes.length - 1 - i) * (MIN_PANE + 8) - 8 * i);
  };

  return (
    <div ref={colRef} data-drop="keep" className="flex h-full min-h-0 flex-col">
      {panes.map((pane, i) => {
        const last = i === panes.length - 1;
        const style: React.CSSProperties = last
          ? { flex: "1 1 0", minHeight: MIN_PANE }
          : pane.height !== undefined
          ? { flex: "0 0 auto", height: pane.height }
          : { flex: "0 1 auto", minHeight: MIN_PANE };
        return (
          <Fragment key={pane.tabs.join()}>
            <div
              ref={(el) => { paneRefs.current[i] = el; }}
              style={style}
              className="flex min-h-0 flex-col rounded-md border border-[#5c4a2a]/80 bg-[#171310]/95 shadow-[inset_0_0_24px_rgba(0,0,0,0.7)]"
            >
              <TabBar api={api} panes={panes} i={i} dragTab={dragTab} setDragTab={setDragTab} />
              <div className="relative flex min-h-0 flex-1 flex-col">
                <div className="chat-scroll min-h-0 flex-1 overflow-y-auto p-2">
                  {pane.active === "inv" && <Inventory api={api} g={g} />}
                  {pane.active === "skills" && <Skills api={api} g={g} />}
                  {pane.active === "prayer" && <Prayer api={api} g={g} />}
                  {pane.active === "quests" && <Quests api={api} g={g} />}
                  {pane.active === "gear" && <Gear api={api} g={g} />}
                </div>
                {dragTab && <DockOverlay i={i} tab={dragTab} onDone={() => setDragTab(null)} />}
              </div>
            </div>
            {!last && (
              <ResizeHandle
                axis="y"
                reverse
                size={pane.height ?? paneRefs.current[i]?.offsetHeight ?? 240}
                onResize={(v) => setPaneHeight(i, Math.round(Math.max(MIN_PANE, Math.min(maxHeight(i), v))))}
                onCommit={() => {}}
                onReset={() => setPaneHeight(i, undefined)}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

/** A pane never gets shorter than this (px). */
const MIN_PANE = 110;

function TabBar({ api, panes, i, dragTab, setDragTab }: {
  api: GameApi; panes: Pane[]; i: number; dragTab: TabId | null; setDragTab: (t: TabId | null) => void;
}) {
  const pane = panes[i];
  const openMenu = useContextMenu();
  const [over, setOver] = useState(false);

  // The same moves as dragging, for right-click and touch
  const tabMenu = (tab: TabId): MenuOption[] => {
    const opts: MenuOption[] = [];
    const name = TAB_LABEL[tab];
    if (pane.tabs.length > 1) opts.push({ label: "Open below", target: name, run: () => dockTab(tab, { pane: i, where: "below" }) });
    if (i > 0) opts.push({ label: "Move to pane above", target: name, run: () => dockTab(tab, { pane: i - 1, where: "tabs" }) });
    if (i < panes.length - 1) opts.push({ label: "Move to pane below", target: name, run: () => dockTab(tab, { pane: i + 1, where: "tabs" }) });
    opts.push({ label: "Reset panel layout", run: resetLayout });
    return opts;
  };

  return (
    <div
      className={`flex border-b transition-colors ${over ? "border-[#d8b25c] bg-[#2a2010]" : "border-[#3a2f1e]"}`}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(TAB_MIME)) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        const tab = e.dataTransfer.getData(TAB_MIME) as TabId;
        setOver(false);
        setDragTab(null);
        if (tab) dockTab(tab, { pane: i, where: "tabs" });
      }}
    >
      {pane.tabs.map((id) => (
        <TabButton
          key={id}
          label={TAB_LABEL[id]}
          active={pane.active === id}
          dragging={dragTab === id}
          onSelect={() => selectTab(i, id)}
          onMenu={(x, y) => openMenu(x, y, tabMenu(id))}
          onDragStart={(e) => {
            e.dataTransfer.setData(TAB_MIME, id);
            e.dataTransfer.effectAllowed = "move";
            // Let the browser grab the drag image before the overlays appear
            requestAnimationFrame(() => setDragTab(id));
          }}
          onDragEnd={() => setDragTab(null)}
        />
      ))}
      {i === 0 && (
        <button
          onClick={() => api.openSettings()}
          title="Engine settings — zoom, renderer & audio"
          className="ml-auto flex shrink-0 items-center px-1.5 text-[#8a7a52] transition-colors hover:bg-[#1d1610] hover:text-[#f0c858]"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin-slow">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      )}
    </div>
  );
}

function TabButton({ label, active, dragging, onSelect, onMenu, onDragStart, onDragEnd }: {
  label: string; active: boolean; dragging: boolean;
  onSelect: () => void; onMenu: (x: number, y: number) => void;
  onDragStart: (e: React.DragEvent) => void; onDragEnd: () => void;
}) {
  const press = useLongPress(onMenu);
  return (
    <button
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => { if (!press.fired()) onSelect(); }}
      onContextMenu={(e) => { e.preventDefault(); onMenu(e.clientX, e.clientY); }}
      {...press.handlers}
      title="Drag to another pane, or right-click to move"
      className={`font-display min-w-0 flex-auto truncate px-0.5 py-2 text-[9.5px] font-bold tracking-[0.03em] transition-colors ${
        active
          ? "border-b-2 border-[#d8b25c] bg-[#241c10] text-[#e8c876]"
          : "text-[#8a7a52] hover:bg-[#1d1610] hover:text-[#c8b070]"
      } ${dragging ? "opacity-40" : ""}`}
    >
      {label.toUpperCase()}
    </button>
  );
}

/** While a tab is dragged: drop on the top or bottom half of a pane to dock it there. */
function DockOverlay({ i, tab, onDone }: { i: number; tab: TabId; onDone: () => void }) {
  const [hot, setHot] = useState<"above" | "below" | null>(null);
  const zone = (where: "above" | "below") => (
    <div
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(TAB_MIME)) return;
        e.preventDefault();
        setHot(where);
      }}
      onDragLeave={() => setHot(null)}
      onDrop={(e) => {
        e.preventDefault();
        setHot(null);
        onDone();
        dockTab(tab, { pane: i, where });
      }}
      className={`flex flex-1 items-center justify-center border-2 border-dashed text-[10.5px] font-bold uppercase tracking-[0.14em] transition-colors ${
        hot === where ? "border-[#d8b25c] bg-[#3a2f14]/85 text-[#f0c858]" : "border-[#5c4a2a]/60 bg-[#0c0906]/55 text-[#8a7a52]"
      }`}
    >
      Dock {TAB_LABEL[tab]} {where}
    </div>
  );
  return (
    <div className="absolute inset-0 z-10 flex flex-col gap-1 p-1.5">
      {zone("above")}
      {zone("below")}
    </div>
  );
}

function Inventory({ api, g }: { api: GameApi; g: GameState }) {
  const [over, setOver] = useState<number | null>(null);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between rounded-sm border border-[#3a2f1e] bg-[#0f0b08] px-2 py-1">
        <span className="text-[11px] text-[#8a7a52]">Purse</span>
        <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#f0c858]">
          <ItemIcon item="coins" size={16} />
          {fmt(g.coins)}
        </span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(56px,1fr))] gap-1.5" onDragLeave={() => setOver(null)}>
        {g.inv.map((_, i) => (
          <InvSlotButton key={i} api={api} g={g} i={i} over={over === i} setOver={setOver} />
        ))}
      </div>
      <p className="mt-2 text-[10.5px] leading-snug text-[#6a5a3a]">
        Click food to eat, bones to bury, gear to wield; anything else is picked up to use on something. Drag to rearrange. Right-click for every option.
      </p>
    </div>
  );
}

function InvSlotButton({ api, g, i, over, setOver }: {
  api: GameApi; g: GameState; i: number; over: boolean; setOver: (i: number | null) => void;
}) {
  const slot = g.inv[i];
  const openMenu = useContextMenu();
  const showMenu = (x: number, y: number) => openMenu(x, y, api.slotActions(i));
  const press = useLongPress(showMenu);
  const touch = useTouchSlotDrag(api, i, slot?.item);
  const selected = g.selected === i;
  return (
    <button
      {...slotDragProps(i, !!slot)}
      onDragOver={(e) => { if (!over && e.dataTransfer.types.includes(SLOT_MIME)) setOver(i); }}
      onDragEnd={() => setOver(null)}
      onDrop={() => setOver(null)}
      onClick={(e) => {
        if (press.fired() || touch.dragged()) return;
        // A combat bottle asks where its XP should go
        if (slot && !e.shiftKey && g.selected === null && ITEMS[slot.item].bottle?.skill === "combat") return showMenu(e.clientX, e.clientY);
        api.clickInventorySlot(i, e.shiftKey);
      }}
      onContextMenu={(e) => { e.preventDefault(); showMenu(e.clientX, e.clientY); }}
      onPointerDown={(e) => { press.handlers.onPointerDown(e); touch.handlers.onPointerDown(e); }}
      onPointerMove={(e) => { press.handlers.onPointerMove(e); touch.handlers.onPointerMove(e); }}
      onPointerUp={(e) => { press.handlers.onPointerUp(); touch.handlers.onPointerUp(e); }}
      onPointerCancel={() => { press.handlers.onPointerCancel(); touch.handlers.onPointerCancel(); }}
      // Occupied slots take the finger for dragging; empty ones still let the panel scroll
      style={{ touchAction: slot ? "none" : undefined }}
      title={slot ? `${ITEMS[slot.item].name} — right-click for options` : "Empty slot"}
      className={`group relative flex aspect-square items-center justify-center rounded-sm border transition-all ${
        selected
          ? "border-[#f0c858] bg-gradient-to-b from-[#3a2f14] to-[#241c10] shadow-[0_0_0_1px_#f0c858,0_0_12px_rgba(240,200,88,0.55)]"
          : over
          ? "border-[#d8b25c] bg-[#241c12]"
          : slot
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
      {touch.ghost}
    </button>
  );
}

function Skills({ api, g }: { api: GameApi; g: GameState }) {
  const openMenu = useContextMenu();
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
            <button
              key={s.id}
              onClick={() => api.openGuide(s.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                openMenu(e.clientX, e.clientY, [{ label: "View guide", target: s.name, run: () => api.openGuide(s.id) }]);
              }}
              className={`rounded-sm border px-2 py-1.5 text-left transition-colors ${
                s.impl
                  ? "border-[#3a2f1e] bg-[#1a140c] hover:border-[#d8b25c]"
                  : "border-[#241c12] bg-[#120e09] opacity-45 hover:opacity-70"
              }`}
              title={
                s.impl
                  ? `${s.name} — ${fmt(g.xp[s.id])} XP total · ${fmt(prog.cur)} / ${fmt(prog.next)} into level. Click for the guide.`
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
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Quests you've taken on: in progress first (with the current step and its
 * count), then finished. New quests aren't listed: look for a ! over
 * someone's head and talk to them.
 */
function Quests({ api, g }: { api: GameApi; g: GameState }) {
  const qp = api.questPoints();
  const total = QUESTS.reduce((s, q) => s + q.reward.qp, 0);
  const taken = QUESTS.filter((q) => g.quests[q.id]);
  const list = [...taken.filter((q) => !g.quests[q.id]!.done), ...taken.filter((q) => g.quests[q.id]!.done)];
  const supply = SUPPLY_RUNS.find((r) => r.id === g.supply);
  const supplyHave = supply ? Math.min(supply.n, g.inv.reduce((s, x) => (x && x.item === supply.item ? s + x.n : s), 0)) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between rounded-sm border border-[#3a2f1e] bg-[#0f0b08] px-2 py-1">
        <span className="font-display text-[10px] font-bold tracking-[0.2em] text-[#a8905a]">QUEST POINTS</span>
        <span className="font-display text-[15px] font-black text-[#e8c876]">{qp}<span className="text-[11px] text-[#8a7a52]"> / {total}</span></span>
      </div>
      {!list.length && !supply && (
        <p className="rounded-sm border border-dashed border-[#3a2f1e] px-3 py-4 text-center text-[11.5px] leading-snug text-[#8a7a52]">
          No quests yet. Look for a <span className="font-bold text-[#ffc81e]">!</span> above someone's head and talk to them.
        </p>
      )}
      <div className="flex flex-col gap-1">
        {supply && (
          <div className="rounded-sm border border-[#2a5a8a] bg-[#0e1622] px-2 py-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-4 shrink-0 text-center text-[12px] font-black text-[#4aa8ff]">!</span>
              <span className="flex-1 truncate text-[12px] font-bold text-[#e0d6c0]">Supply Run</span>
              <span className="shrink-0 text-[9.5px] uppercase tracking-wider text-[#8a7a52]">Roka · daily</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 pl-5 text-[10.5px]">
              <span className={`flex-1 ${supplyHave >= supply.n ? "text-[#7ee06a]" : "text-[#c8b070]"}`}>
                Bring Roka {supply.n} {supply.label}{supplyHave >= supply.n ? " · report to Roka" : ""}
              </span>
              <span className="font-bold tabular-nums text-[#f0c858]">{supplyHave}/{supply.n}</span>
            </div>
          </div>
        )}
        {list.map((q) => {
          const p = g.quests[q.id]!;
          const step = p.done ? null : q.steps[p.step];
          const prog = step ? api.stepProgress(q) : null;
          return (
            <div
              key={q.id}
              className={`rounded-sm border px-2 py-1.5 ${p.done ? "border-[#2a3a1e] bg-[#10140c]" : "border-[#8a6a2e] bg-[#1f180e]"}`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-4 shrink-0 text-center text-[11px]">
                  {p.done ? <span className="text-[#7ee06a]">✔</span> : prog?.met ? <span className="font-black text-[#ffc81e]">?</span> : "📜"}
                </span>
                <span className={`flex-1 truncate text-[12px] font-bold ${p.done ? "text-[#8aa070]" : "text-[#e0d6c0]"}`}>{q.name}</span>
                <span className="shrink-0 text-[9.5px] uppercase tracking-wider text-[#8a7a52]">{NPC_NAME[q.giver]}</span>
              </div>
              {step && prog && (
                <div className="mt-0.5 flex items-center gap-1.5 pl-5 text-[10.5px]">
                  <span className={`flex-1 ${prog.met ? "text-[#7ee06a]" : "text-[#c8b070]"}`}>
                    {step.goal}{prog.met ? ` · report to ${NPC_NAME[q.giver]}` : ""}
                  </span>
                  {prog.need > 1 && <span className="font-bold tabular-nums text-[#f0c858]">{prog.n}/{prog.need}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[10.5px] leading-snug text-[#6a5a3a]">
        A gold <span className="font-bold text-[#ffc81e]">!</span> means a new quest, blue <span className="font-bold text-[#4aa8ff]">!</span> a daily job, and <span className="font-bold text-[#ffc81e]">?</span> that something's ready to hand in.
      </p>
    </div>
  );
}

/** Prayer points and the blessings to spend them on. */
function Prayer({ api, g }: { api: GameApi; g: GameState }) {
  const lvl = levelForXp(g.xp.prayer);
  const pts = Math.ceil(g.prayer);
  const drainPerMin = g.blessings.reduce((sum, id) => sum + 60000 / BLESSING_BY_ID[id].drainMs, 0);
  return (
    <div>
      <div className="mb-2 rounded-sm border border-[#3a2f1e] bg-[#0f0b08] px-2.5 py-2">
        <div className="flex items-center justify-between">
          <span className="font-display text-[10px] font-bold tracking-[0.2em] text-[#a8905a]">PRAYER POINTS</span>
          <span className="font-display text-[15px] font-black text-[#e8e4f8]">{pts}<span className="text-[11px] text-[#8a7a52]"> / {lvl}</span></span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#0c0906]">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${Math.min(1, g.prayer / lvl) * 100}%`, background: "linear-gradient(90deg, #9ad8ef, #f4f1ff)" }}
          />
        </div>
        <div className="mt-1 text-[10px] text-[#6a5a3a]">
          {g.blessings.length ? `Draining ${drainPerMin.toFixed(1).replace(/\.0$/, "")} point${drainPerMin === 1 ? "" : "s"} a minute` : "Recharge at the altar in Greyhallow Chapel"}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {BLESSINGS.map((b) => {
          const untaught = !!b.quest && !g.quests[b.quest]?.done;
          const locked = lvl < b.level || untaught;
          const on = g.blessings.includes(b.id);
          return (
            <button
              key={b.id}
              onClick={() => api.toggleBlessing(b.id)}
              aria-pressed={on}
              title={untaught ? "Taught by Brother Cael's quest, The Restless Crypt" : locked ? `Needs level ${b.level} Prayer` : `${b.effect}. Drains 1 point every ${b.drainMs / 1000}s. Click to turn ${on ? "off" : "on"}.`}
              className={`flex items-center gap-2 rounded-sm border px-2 py-1.5 text-left transition-all ${
                on
                  ? "border-[#e8e4f8] bg-gradient-to-b from-[#2c2a3a] to-[#1a1824] shadow-[0_0_10px_rgba(220,220,255,0.3)]"
                  : locked
                  ? "border-[#241c12] bg-[#120e09] opacity-45"
                  : "border-[#3a2f1e] bg-[#1a140c] hover:border-[#d8b25c]"
              }`}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[13px]"
                style={{ borderColor: on ? "#e8e4f8" : "#5c4a2a", background: "rgba(0,0,0,0.35)" }}
              >
                {locked ? "🔒" : b.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[12px] font-bold ${on ? "text-[#f4f1ff]" : "text-[#e0d6c0]"}`}>{b.name}</span>
                <span className="block text-[10px] leading-tight text-[#8a7a52]">{b.effect}</span>
              </span>
              <span className={`shrink-0 text-[10.5px] font-bold ${locked ? "text-[#ff8a72]" : on ? "text-[#e8e4f8]" : "text-[#c8b070]"}`}>
                {on ? "ON" : untaught ? "Quest" : `Lvl ${b.level}`}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10.5px] leading-snug text-[#6a5a3a]">
        Your Prayer level is your most prayer points. Bury bones to raise it. Blessings stay on until you switch them off or your points run out.
      </p>
    </div>
  );
}

/** Choose whether melee hits train Attack, Strength or both (never neither). */
function CombatTraining({ api, g }: { api: GameApi; g: GameState }) {
  const xp = g.combatXp;
  const options: ["attack" | "strength", string, string][] = [
    ["attack", "Attack", "Accuracy: land hits more often"],
    ["strength", "Strength", "Power: hit harder"],
  ];
  return (
    <div className="mt-1 rounded-sm border border-[#241c12] bg-[#0f0b08] px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-[0.16em] text-[#8a7a52]">Combat training</div>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        {options.map(([id, label, hint]) => {
          const on = xp[id];
          const locked = on && !xp[id === "attack" ? "strength" : "attack"];
          return (
            <button
              key={id}
              onClick={() => api.toggleCombatXp(id)}
              aria-pressed={on}
              title={locked ? `${label} is the only one on. At least one must stay selected.` : `${hint}. Click to turn ${on ? "off" : "on"}.`}
              className={`rounded-sm border px-2 py-1.5 text-left transition-all ${
                on
                  ? "border-[#d8b25c] bg-gradient-to-b from-[#3a2f14] to-[#241c10] text-[#f0c858]"
                  : "border-[#2a2115] bg-[#120d08] text-[#5a4a2c] hover:border-[#6a5428]"
              } ${locked ? "cursor-not-allowed" : ""}`}
            >
              <span className="block text-[12px] font-bold">{on ? "✔" : "○"} {label}</span>
              <span className="block text-[9.5px] leading-tight opacity-80">{locked ? "must stay on" : on ? "training" : "off"}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 text-[10px] leading-snug text-[#6a5a3a]">
        Each hit's XP is shared between the skills switched on, so one alone trains twice as fast. Defence grows from the blows you take. Hitpoints from every hit.
      </div>
    </div>
  );
}

function Gear({ api, g }: { api: GameApi; g: GameState }) {
  const slots: ToolSlot[] = ["weapon", "armor", "axe", "pick", "rod"];
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
      <CombatTraining api={api} g={g} />
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
