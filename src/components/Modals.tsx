import type { GameState, ItemId } from "../game/types";
import type { GameApi } from "../game/useGame";
import { ITEMS, RECIPES, SELL_RATIO, SHOP_STOCK, STATION_NAMES } from "../game/data";
import { SKILL_BY_ID, fmt, levelForXp } from "../game/xp";
import { ItemIcon } from "./ItemIcon";

function Backdrop({ onClose, children, wide = false }: { onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      style={{ animation: "fadeIn 0.15s ease-out" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`rs-panel w-full ${wide ? "max-w-2xl" : "max-w-xl"}`}
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
  // sorted so stacks never jump around as quantities change
  const entries = (Object.entries(g.bank) as [ItemId, number][])
    .filter(([, n]) => n > 0)
    .sort(([a], [b]) => ITEMS[a].name.localeCompare(ITEMS[b].name));
  const COLS = 6;
  const rows = Math.max(6, Math.ceil(entries.length / COLS)); // 6×6 vault, growing a row at a time
  const cells = rows * COLS;

  return (
    <Backdrop onClose={api.closeOverlays} wide>
      <Header title="BANK OF FORGEBOUND" onClose={api.closeOverlays} />
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-[1.35fr_1fr]">
        {/* the vault */}
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7a52]">Vault</span>
            <span className="text-[10.5px] text-[#6a5a3a]">{entries.length} / {cells} slots</span>
          </div>
          <div className="chat-scroll max-h-[336px] overflow-y-auto rounded-sm border border-[#3a2f1e] bg-[#0f0b08] p-2">
            <div className="grid grid-cols-6 gap-1.5">
              {Array.from({ length: cells }, (_, i) => {
                const entry = entries[i];
                if (!entry) {
                  return <div key={`empty-${i}`} className="aspect-square rounded-sm border border-[#2a2115] bg-[#120d08]" />;
                }
                const [id, n] = entry;
                return (
                  <button
                    key={id}
                    onClick={() => api.withdraw(id, 1)}
                    onContextMenu={(e) => { e.preventDefault(); api.withdraw(id, n); }}
                    title={`${ITEMS[id].name} ×${n} — click: withdraw 1 · right-click: withdraw all`}
                    className="group relative flex aspect-square items-center justify-center rounded-sm border border-[#4a3a20] bg-gradient-to-b from-[#241c12] to-[#171008] transition-all hover:border-[#d8b25c] hover:shadow-[0_0_8px_rgba(216,178,92,0.35)] active:scale-95"
                  >
                    <ItemIcon item={id} size={30} />
                    <span className="absolute bottom-0 right-0.5 text-[10px] font-bold text-[#f0e0b0] [text-shadow:0_1px_2px_#000]">{n}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <p className="mt-1.5 text-[10.5px] leading-snug text-[#6a5a3a]">
            Click a slot to withdraw one · right-click takes the whole stack. The vault grows a row of six whenever it fills.
          </p>
        </div>

        {/* satchel */}
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7a52]">Inventory</span>
            <button onClick={api.depositAll} className="bank-btn !px-2 !py-0.5">Deposit all</button>
          </div>
          <div className="rounded-sm border border-[#3a2f1e] bg-[#0f0b08] p-2">
            <div className="grid grid-cols-4 gap-1.5">
              {g.inv.map((s, i) => {
                const depositable = s !== null && s.item !== "coins";
                return (
                  <button
                    key={i}
                    disabled={!depositable}
                    onClick={() => depositable && api.depositSlot(i)}
                    title={
                      depositable
                        ? `Deposit ${ITEMS[s!.item].name}${s!.n > 1 ? ` ×${s!.n}` : ""}`
                        : s
                          ? "Coins stay in your purse"
                          : "Empty slot"
                    }
                    className={`relative flex aspect-square items-center justify-center rounded-sm border transition-all ${
                      s
                        ? depositable
                          ? "border-[#4a3a20] bg-gradient-to-b from-[#241c12] to-[#171008] hover:border-[#d8b25c] hover:shadow-[0_0_8px_rgba(216,178,92,0.35)] active:scale-95"
                          : "cursor-not-allowed border-[#3a2f1e] bg-[#1a150c] opacity-70"
                        : "border-[#2a2115] bg-[#120d08]"
                    }`}
                  >
                    {s && <ItemIcon item={s.item} size={26} />}
                    {s && s.n > 1 && (
                      <span className="absolute bottom-0 right-0.5 text-[10px] font-bold text-[#f0e0b0] [text-shadow:0_1px_2px_#000]">{s.n}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="mt-1.5 text-[10.5px] leading-snug text-[#6a5a3a]">
            Click anything to send it to the vault. Coins stay on you.
          </p>
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
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7a52]">Buy</span>
            <span className="flex items-center gap-1 text-[11.5px] font-bold text-[#f0c858]">
              <ItemIcon item="coins" size={14} /> {fmt(g.coins)}
            </span>
          </div>
          <div className="chat-scroll max-h-64 overflow-y-auto rounded-sm border border-[#3a2f1e] bg-[#0f0b08] p-1.5">
            {SHOP_STOCK.map((id) => {
              const def = ITEMS[id];
              const afford = g.coins >= def.price;
              return (
                <div key={id} className="mb-1 flex items-center gap-2 rounded-sm border border-[#2a2115] bg-[#171008] px-2 py-1.5 last:mb-0">
                  <ItemIcon item={id} size={22} />
                  <span className="flex-1 truncate text-[12px] font-bold text-[#e0d6c0]">{def.name}</span>
                  <span className={`text-[11.5px] font-bold ${afford ? "text-[#f0c858]" : "text-[#7a5a3a]"}`}>{fmt(def.price)}</span>
                  <button
                    onClick={() => api.buy(id)}
                    disabled={!afford}
                    className={`bank-btn ${afford ? "!border-[#6a5420] !text-[#f0c858] hover:!border-[#d8b25c]" : "opacity-40"}`}
                  >
                    Buy
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <div className="mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7a52]">
              Sell · {Math.round(SELL_RATIO * 100)}% of value
            </span>
          </div>
          <div className="chat-scroll max-h-64 overflow-y-auto rounded-sm border border-[#3a2f1e] bg-[#0f0b08] p-1.5">
            {g.inv.every((s) => s === null || s.item === "coins") && (
              <p className="px-2 py-4 text-center text-[11.5px] text-[#5a4c32]">
                Roka eyes your empty bag. "Come back when you've got goods."
              </p>
            )}
            {g.inv.map((s, i) =>
              s && s.item !== "coins" ? (
                <div key={i} className="mb-1 flex items-center gap-2 rounded-sm border border-[#2a2115] bg-[#171008] px-2 py-1.5">
                  <ItemIcon item={s.item} size={22} />
                  <span className="flex-1 truncate text-[12px] font-bold text-[#e0d6c0]">{ITEMS[s.item].name}</span>
                  <span className="text-[11.5px] font-bold text-[#f0c858]">
                    {fmt(Math.max(1, Math.floor(ITEMS[s.item].price * SELL_RATIO)) * s.n)}
                  </span>
                  <button onClick={() => api.sellSlot(i)} className="bank-btn !border-[#6a5420] !text-[#f0c858] hover:!border-[#d8b25c]">
                    Sell
                  </button>
                </div>
              ) : null
            )}
          </div>
        </div>
      </div>
    </Backdrop>
  );
}
