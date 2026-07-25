import React from "react";
import type { ItemId } from "../game/types";
import { ITEMS } from "../game/data";

interface Props {
  item: ItemId;
  size?: "sm" | "md" | "lg" | number;
  count?: number;
}

export const ItemIcon: React.FC<Props> = ({ item, size = "md", count }) => {
  const def = ITEMS[item] || { name: item, cat: "resource" };

  const getEmoji = (id: ItemId): string => {
    switch (id) {
      case "coins": return "🪙";
      case "logs": return "🪵";
      case "oak_logs": return "🌳";
      case "copper_ore": return "🪨";
      case "tin_ore": return "⚙️";
      case "iron_ore": return "🪨";
      case "coal": return "⬛";
      case "gold_ore": return "✨";
      case "raw_shrimp": return "🦐";
      case "shrimp": return "🍤";
      case "raw_trout": return "🐟";
      case "trout": return "🐠";
      case "bronze_bar": return "🟧";
      case "iron_bar": return "⬜";
      case "steel_bar": return "🔩";
      case "bronze_dagger": return "🗡️";
      case "iron_dagger": return "🗡️";
      case "steel_dagger": return "🗡️";
      case "bronze_sword": return "⚔️";
      case "bronze_platebody": return "🛡️";
      case "bronze_axe": return "🪓";
      case "iron_axe": return "🪓";
      case "steel_axe": return "🪓";
      case "mithril_axe": return "🪓";
      case "bronze_pick": return "⛏️";
      case "iron_pick": return "⛏️";
      case "steel_pick": return "⛏️";
      case "mithril_pick": return "⛏️";
      case "fly_rod": return "🎣";
      case "bones": return "🦴";
      case "raw_beef": return "🥩";
      case "cooked_beef": return "🍖"; // Steak
      case "raw_chicken": return "🍗";
      case "cooked_chicken": return "🍗";
      case "feathers": return "🪶";
      case "egg": return "🥚";
      case "fried_egg": return "🍳";
      default: return "📦";
    }
  };

  // Hand-drawn 24×24 SVG icons for the v0.2.1 livestock set — no external assets.
  const getSvg = (id: ItemId): React.ReactNode | null => {
    switch (id) {
      case "bones":
        return (
          <svg viewBox="0 0 24 24" className="h-full w-full">
            <g stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" fill="#e2e8f0">
              <path d="M6 6 L18 18" />
              <circle cx="5" cy="5" r="2.2" /><circle cx="7.5" cy="4" r="2.2" />
              <circle cx="19" cy="19" r="2.2" /><circle cx="16.5" cy="20" r="2.2" />
            </g>
            <g stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" opacity="0.7">
              <path d="M18 6 L6 18" />
            </g>
            <circle cx="19" cy="5" r="1.8" fill="#cbd5e1" /><circle cx="16.5" cy="4" r="1.8" fill="#cbd5e1" />
            <circle cx="5" cy="19" r="1.8" fill="#cbd5e1" /><circle cx="7.5" cy="20" r="1.8" fill="#cbd5e1" />
          </svg>
        );
      case "raw_beef":
        return (
          <svg viewBox="0 0 24 24" className="h-full w-full">
            <path d="M4 9 Q4 5 9 5 L17 5 Q21 5 20.5 10 Q21 16 16 18 L9 19 Q4 19 4 14 Z" fill="#b91c1c" stroke="#7f1d1d" strokeWidth="1" />
            <path d="M5.5 9.5 Q6 6.5 10 6.5 L16 6.5" fill="none" stroke="#fecaca" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="14" cy="13" r="1.4" fill="#fecaca" opacity="0.8" />
          </svg>
        );
      case "cooked_beef":
        return (
          <svg viewBox="0 0 24 24" className="h-full w-full">
            <path d="M4 9 Q4 5 9 5 L17 5 Q21 5 20.5 10 Q21 16 16 18 L9 19 Q4 19 4 14 Z" fill="#92400e" stroke="#5b2c0a" strokeWidth="1" />
            <path d="M7 9 L10 15 M11.5 8 L14.5 15 M16 8 L18.5 13" stroke="#451a03" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M5.5 9 Q6 6.5 10 6.5" fill="none" stroke="#fbbf24" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
          </svg>
        );
      case "raw_chicken":
        return (
          <svg viewBox="0 0 24 24" className="h-full w-full">
            <path d="M8 6 Q15 4 18 9 Q20 14 14 16 Q9 17 7.5 13 Z" fill="#fbcfe8" stroke="#f9a8d4" strokeWidth="1" />
            <path d="M7.5 13 L5 18" stroke="#f9a8d4" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="4.5" cy="19" r="1.6" fill="#fdf2f8" /><circle cx="6.2" cy="19.6" r="1.6" fill="#fdf2f8" />
            <circle cx="14.5" cy="10" r="1.2" fill="#fdf2f8" opacity="0.9" />
          </svg>
        );
      case "feathers":
        return (
          <svg viewBox="0 0 24 24" className="h-full w-full">
            <path d="M19 4 Q10 6 7 13 Q5.5 17 6 19 Q11 18 15 13 Q18.5 8.5 19 4 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
            <path d="M18 5 L7 18" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M14 8 L10.5 9.5 M12.5 11 L9 12.5 M11 13.5 L8 15" stroke="#94a3b8" strokeWidth="0.8" />
          </svg>
        );
      case "egg":
        return (
          <svg viewBox="0 0 24 24" className="h-full w-full">
            <ellipse cx="12" cy="13" rx="6.5" ry="8" fill="#fef3c7" stroke="#fcd34d" strokeWidth="1" />
            <ellipse cx="9.8" cy="9.5" rx="2" ry="2.8" fill="#fffbeb" opacity="0.9" />
          </svg>
        );
      case "fried_egg":
        return (
          <svg viewBox="0 0 24 24" className="h-full w-full">
            <path d="M5 12 Q4 7 9 7 Q11 4 15 6 Q20 6 20 11 Q21 16 16 17 Q13 20 9 18 Q4 17 5 12 Z" fill="#fafaf9" stroke="#e7e5e4" strokeWidth="1" />
            <circle cx="12.5" cy="12" r="3.6" fill="#fbbf24" stroke="#f59e0b" strokeWidth="0.8" />
            <circle cx="11.4" cy="11" r="1" fill="#fde68a" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getTierTint = (id: ItemId): string => {
    if (id === "bones") return "text-[#e2e8f0] border-[#94a3b8]/50 bg-[#334155]/40";
    if (id === "feathers") return "text-[#fde047] border-[#eab308]/50 bg-[#713f12]/40";
    if (id === "cooked_beef" || id === "cooked_chicken" || id === "fried_egg") return "text-[#f0c858] border-[#8a6420]/70 bg-[#241c10]/80"; // cooked = golden
    if (id.includes("beef") || id.includes("chicken") || id.includes("egg")) return "text-[#fca5a5] border-[#ef4444]/50 bg-[#7f1d1d]/40"; // raw = red
    if (id.startsWith("bronze_") || id === "copper_ore") return "text-[#f0c858] border-[#8a6420]/60 bg-[#241c10]/80";
    if (id.startsWith("iron_") || id === "tin_ore") return "text-[#d8d0bc] border-[#6a5420]/60 bg-[#160e08]/80";
    if (id.startsWith("steel_") || id === "coal") return "text-[#9fd8ef] border-[#3a5f8f]/60 bg-[#0f172a]/80";
    if (id.startsWith("mithril_") || id === "gold_ore" || id === "coins") return "text-[#ffe14a] border-[#d8b25c] bg-[#3a2f14]/60 shadow-sm";
    if (id.includes("trout") || id.includes("shrimp") || id === "fly_rod") return "text-[#9fd8ef] border-[#3a5f8f]/50 bg-[#121c2a]/60";
    return "text-[#7ee06a] border-[#3e6224]/50 bg-[#122410]/60";
  };

  // Numeric size: bare glyph at that pixel size (used in the top bar coin readout)
  if (typeof size === "number") {
    const svg = getSvg(item);
    return (
      <span
        title={def.name}
        className="inline-flex items-center justify-center leading-none select-none"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.92) }}
      >
        {svg ?? getEmoji(item)}
      </span>
    );
  }

  const sizeClass = {
    sm: "w-8 h-8 text-base",
    md: "w-11 h-11 text-xl",
    lg: "w-14 h-14 text-2xl",
  }[size];

  return (
    <div
      title={`${def.name}${def.price ? ` (${def.price} coins)` : ""}`}
      className={`relative flex items-center justify-center rounded border shadow-inner font-mono transition-transform hover:scale-105 ${sizeClass} ${getTierTint(item)}`}
    >
      <span className="drop-shadow-md select-none">{getSvg(item) ?? getEmoji(item)}</span>
      
      {def.tier && (
        <div className="absolute top-0.5 right-1 text-[9px] font-bold px-1 py-0 rounded bg-[#0c0a07] text-[#f0c858] border border-[#6a5428]">
          T{def.tier}
        </div>
      )}

      {count !== undefined && count > 0 && (
        <span className="absolute bottom-0.5 right-1 px-1 bg-[#0c0906]/95 text-[#f0c858] font-bold text-[10px] rounded border border-[#6a5420] leading-tight">
          {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
        </span>
      )}
    </div>
  );
};
