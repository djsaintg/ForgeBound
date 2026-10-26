import React from "react";
import type { BottleSize, BottleSkill, ItemId } from "../game/types";
import { SKILL_BY_ID } from "../game/xp";
import { ITEMS } from "../game/data";
import { ORE_COLORS } from "../game/render";
import { GEAR, GEAR_OUTLINE, gearColor, gearFor, type GearShape, type Metal } from "../game/gear";

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
      default: return ITEMS[id]?.bottle ? "🧪" : "📦";
    }
  };

  // A faceted rock chunk studded with mineral crystals — shared by every ore,
  // tinted with the same colours the world's ore veins use.
  const oreSvg = (fleck: string, rock = "#5a5048", rockLight = "#7a6e62", rockDark = "#3e3630") => (
    <svg viewBox="3 3.5 18 18" className="h-full w-full">
      <path d="M4 15 L6 8 L11 5 L17 6 L20 11 L19 17 L13 20 L7 19 Z" fill={rock} stroke="#1c1814" strokeWidth="1" strokeLinejoin="round" />
      <path d="M6 8 L11 5 L12 11 L4 15 Z" fill={rockLight} opacity="0.75" />
      <path d="M12 11 L20 11 L19 17 L13 20 Z" fill={rockDark} opacity="0.8" />
      <g fill={fleck} stroke="#1c1814" strokeWidth="0.5" strokeLinejoin="round">
        <path d="M7.5 10 L10 8.8 L10.8 11.2 L8.4 12.4 Z" />
        <path d="M13 13 L15.8 12.4 L15.3 15.2 L12.8 15.8 Z" />
        <path d="M13.8 7.4 L16.4 8 L15.2 9.9 Z" />
        <path d="M7.6 15 L10.2 14.4 L9.6 16.9 Z" />
      </g>
      <g fill="#ffffff" opacity="0.7">
        <circle cx="8.6" cy="9.8" r="0.6" /><circle cx="14" cy="13.1" r="0.6" /><circle cx="14.7" cy="8.1" r="0.45" />
      </g>
    </svg>
  );

  // A cast ingot seen from slightly above: lit top face, tapered front face,
  // a smelter's stamp and a metallic glint. Shared by every bar, tinted per metal.
  const barSvg = (top: string, front: string, dark: string, glint = "#ffffff") => (
    <svg viewBox="2 3.3 20 20" className="h-full w-full">
      <ellipse cx="12" cy="18.6" rx="9" ry="1.6" fill="#000000" opacity="0.35" />
      <path d="M4.5 10.5 L19.5 10.5 L21 17 L3 17 Z" fill={front} stroke="#1c1814" strokeWidth="1" strokeLinejoin="round" />
      <path d="M3 17 L21 17 L20.6 15.4 L3.4 15.4 Z" fill={dark} opacity="0.85" />
      <path d="M7 6.5 L17 6.5 L19.5 10.5 L4.5 10.5 Z" fill={top} stroke="#1c1814" strokeWidth="1" strokeLinejoin="round" />
      <path d="M9.6 7.9 L14.4 7.9 L15.2 9.3 L8.8 9.3 Z" fill={front} opacity="0.55" />
      <path d="M7.6 7.3 L11 7.3" stroke={glint} strokeWidth="0.9" strokeLinecap="round" opacity="0.85" />
      <path d="M5.6 12 L6.2 15" stroke={glint} strokeWidth="0.8" strokeLinecap="round" opacity="0.45" />
    </svg>
  );

  // Tools and weapons: the same shapes the hero holds in the world, tilted 45°
  // like a backpack icon and tinted per metal so tiers read at a glance.
  const gearSvg = (shape: GearShape, metal: Metal) => {
    const def = GEAR[shape];
    const k = def.iconScale;
    const tf = def.upright ? undefined : `translate(12 12) rotate(45) scale(${k}) translate(-12 -12)`;
    return (
      <svg viewBox="0 0 24 24" className="h-full w-full">
        <g transform={tf} strokeLinejoin="round" strokeLinecap="round">
          {def.parts.map((p, i) => (
            <React.Fragment key={i}>
              {p.fill && (
                <path d={p.d} fill={gearColor(p.fill, metal)} opacity={p.op}
                  stroke={p.bare ? undefined : GEAR_OUTLINE} strokeWidth={p.bare ? undefined : 0.8 / k} />
              )}
              {p.stroke && <path d={p.d} fill="none" stroke={gearColor(p.stroke, metal)} strokeWidth={p.w ?? 0.6} opacity={p.op} />}
            </React.Fragment>
          ))}
        </g>
      </svg>
    );
  };

  // Three logs stacked end-on: cut faces with growth rings, bark rims.
  const logsSvg = (face: string, ring: string, bark: string, leaf?: string) => (
    <svg viewBox="0 0 24 24" className="h-full w-full">
      <ellipse cx="12" cy="21" rx="9.5" ry="1.4" fill="#000000" opacity="0.3" />
      {([[7.4, 15.6], [16.6, 15.6], [12, 8.2]] as const).map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="4.4" fill={face} stroke={bark} strokeWidth="1.7" />
          <circle cx={x} cy={y} r="2.5" fill="none" stroke={ring} strokeWidth="0.6" />
          <circle cx={x} cy={y} r="0.8" fill={ring} />
          <path d={`M${x - 2.6} ${y - 1.6} Q${x - 1.6} ${y - 2.9} ${x} ${y - 3.1}`} fill="none" stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round" opacity="0.4" />
        </g>
      ))}
      {leaf && <path d="M15.6 4.6 Q18.6 1.8 21 3 Q20 6.4 16.2 6.2 Z M15.6 4.6 L19.4 3.4" fill={leaf} stroke="#1f3b18" strokeWidth="0.5" strokeLinejoin="round" />}
    </svg>
  );

  // A ribeye-style cut: fat rim along the top, a round bone, marbled meat.
  // Raw is red with white marbling; cooked is seared brown with grill marks.
  const steakSvg = (cooked: boolean) => {
    const meat = cooked ? "#8a4a1e" : "#c0302c";
    const edge = cooked ? "#4e2610" : "#7a1a18";
    const fat = cooked ? "#d8a860" : "#f4e2cc";
    const cut = "M3.6 12.4 Q3 7.4 7.6 5.6 Q12 4 16.4 5.4 Q21 7 20.8 12 Q20.6 17 16 18.6 Q11 20.2 7 18.4 Q3.8 16.8 3.6 12.4 Z";
    return (
      <svg viewBox="0 0 24 24" className="h-full w-full">
        <ellipse cx="12.2" cy="20.4" rx="8.4" ry="1.3" fill="#000000" opacity="0.3" />
        <path d={cut} fill={fat} stroke={edge} strokeWidth="1" strokeLinejoin="round" />
        <path d="M5.4 12.6 Q5 8.8 8.4 7.4 Q12 6.2 15.8 7.2 Q19.2 8.4 19 12.2 Q18.8 16 15.2 17.2 Q11 18.4 7.8 17 Q5.6 15.6 5.4 12.6 Z" fill={meat} />
        {cooked ? (
          <path d="M7.6 9.6 L11.4 15.4 M10.8 8.4 L14.8 14.6 M14.2 8 L17.6 13.2" stroke="#3a1c0a" strokeWidth="1.3" strokeLinecap="round" opacity="0.85" />
        ) : (
          <path d="M7 11.4 Q9 10.6 10.6 12 Q12 13.2 13.8 12.2 M8.4 14.8 Q10.4 14 12 15.2 M14.6 9.6 Q16.2 9.2 17.4 10.4 M15.4 14.2 Q16.6 13.6 17.6 14.6" stroke="#f8d8d0" strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.8" />
        )}
        <circle cx="9.4" cy="10.2" r="2.1" fill="#f1e6d0" stroke={edge} strokeWidth="0.6" />
        <circle cx="9.4" cy="10.2" r="0.8" fill={cooked ? "#a0703a" : "#d88a7a"} />
        <path d="M8 6.4 Q12 5.2 16 6.2" stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.45" />
      </svg>
    );
  };

  // XP bottle: a corked glass flask of glowing liquid in the skill's colour.
  // Small is a squat vial, medium a round flask, large a tall decanter.
  const bottleSvg = (skill: BottleSkill, size: BottleSize) => {
    const liquid = skill === "combat" ? "#e05252" : SKILL_BY_ID[skill].color;
    const body = {
      small: "M9.6 9 L14.4 9 L15.6 12 Q16.4 19.4 12 19.6 Q7.6 19.4 8.4 12 Z",
      medium: "M10.4 8.6 L13.6 8.6 L13.6 10.4 Q18.6 12.2 17.6 16.6 Q16.6 20.4 12 20.4 Q7.4 20.4 6.4 16.6 Q5.4 12.2 10.4 10.4 Z",
      large: "M10.6 6.4 L13.4 6.4 L13.4 9.6 Q17.6 11 17.4 15.4 L17.2 19 Q17 21 12 21 Q7 21 6.8 19 L6.6 15.4 Q6.4 11 10.6 9.6 Z",
    }[size];
    const fillTop = { small: 12.6, medium: 13, large: 12.4 }[size];
    const neckTop = { small: 9, medium: 8.6, large: 6.4 }[size];
    const clip = `bottle-${skill}-${size}`;
    return (
      <svg viewBox="0 0 24 24" className="h-full w-full">
        <defs>
          <clipPath id={clip}><path d={body} /></clipPath>
          <radialGradient id={`${clip}-g`} cx="0.4" cy="0.35" r="0.75">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="0.3" stopColor={liquid} />
            <stop offset="1" stopColor={liquid} stopOpacity="0.75" />
          </radialGradient>
        </defs>
        <ellipse cx="12" cy="21.4" rx="6" ry="1" fill="#000000" opacity="0.3" />
        <circle cx="12" cy="15.6" r="7.5" fill={liquid} opacity="0.16" />
        <path d={body} fill="#cfe6ee" opacity="0.22" />
        <rect x="4" y={fillTop} width="16" height="10" fill={`url(#${clip}-g)`} clipPath={`url(#${clip})`} />
        <path d={body} fill="none" stroke="#1c1814" strokeWidth="0.9" strokeLinejoin="round" />
        <path d={`M9.4 ${fillTop + 1.4} Q9 ${fillTop + 4} 10 ${fillTop + 5.6}`} stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.55" />
        <rect x="10.2" y={neckTop - 2.4} width="3.6" height="2.6" rx="0.6" fill="#a8743c" stroke="#1c1814" strokeWidth="0.7" />
      </svg>
    );
  };

  // Hand-drawn 24×24 SVG icons for the v0.2.1 livestock set — no external assets.
  const getSvg = (id: ItemId): React.ReactNode | null => {
    const gear = gearFor(id);
    if (gear) return gearSvg(gear.shape, gear.metal);
    const bottle = ITEMS[id]?.bottle;
    if (bottle) return bottleSvg(bottle.skill, bottle.size);
    switch (id) {
      case "logs": return logsSvg("#e2bd80", "#b8864a", "#6a4020");
      case "oak_logs": return logsSvg("#c8945a", "#8a5a2c", "#3e2410", "#5a9a3a");
      case "copper_ore": return oreSvg(ORE_COLORS.R);
      case "tin_ore": return oreSvg(ORE_COLORS.S);
      case "iron_ore": return oreSvg(ORE_COLORS.I);
      case "gold_ore": return oreSvg(ORE_COLORS.G);
      // Coal is the rock itself: a black lump with a cool glassy sheen
      case "coal": return oreSvg("#5a6070", ORE_COLORS.C, "#3a3c48", "#16171d");
      case "bronze_bar": return barSvg("#d8955a", "#a8643a", "#6e3c1e", "#ffe2bc");
      case "iron_bar": return barSvg("#b4b8bc", "#83888e", "#53575c", "#f4f6f8");
      case "steel_bar": return barSvg("#c4d0dc", "#8a9cb2", "#55647a", "#eef6ff");
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
      case "raw_beef": return steakSvg(false);
      case "cooked_beef": return steakSvg(true);
      case "raw_chicken":
        return (
          <svg viewBox="0 0 24 24" className="h-full w-full">
            <path d="M8 6 Q15 4 18 9 Q20 14 14 16 Q9 17 7.5 13 Z" fill="#fbcfe8" stroke="#f9a8d4" strokeWidth="1" />
            <path d="M7.5 13 L5 18" stroke="#f9a8d4" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="4.5" cy="19" r="1.6" fill="#fdf2f8" /><circle cx="6.2" cy="19.6" r="1.6" fill="#fdf2f8" />
            <circle cx="14.5" cy="10" r="1.2" fill="#fdf2f8" opacity="0.9" />
          </svg>
        );
      case "cooked_chicken":
        return (
          <svg viewBox="0 0 24 24" className="h-full w-full">
            <path d="M8 6 Q15 4 18 9 Q20 14 14 16 Q9 17 7.5 13 Z" fill="#b8682a" stroke="#6b3410" strokeWidth="1" />
            <path d="M9.6 7.4 Q14.4 5.8 16.6 9.2" fill="none" stroke="#e8a050" strokeWidth="1.4" strokeLinecap="round" opacity="0.85" />
            <path d="M11 12.6 L13 11.4 M13.6 13.6 L15.6 12.2" stroke="#7a3c14" strokeWidth="0.9" strokeLinecap="round" />
            <path d="M7.5 13 L5 18" stroke="#f5ecd8" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="4.5" cy="19" r="1.6" fill="#f5ecd8" /><circle cx="6.2" cy="19.6" r="1.6" fill="#f5ecd8" />
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
