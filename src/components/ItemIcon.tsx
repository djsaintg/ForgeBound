import type { ItemId } from "../game/types";
import { ITEMS } from "../game/data";

const TIER_COLORS: Record<number, string> = {
  1: "#b0763a", 2: "#9aa0a8", 3: "#ccd2da", 4: "#7a8fc8",
};
const ORE_COLORS: Record<string, string> = {
  copper_ore: "#d0783f", tin_ore: "#c9cdd6", iron_ore: "#b06a3c",
  coal: "#3a3a42", gold_ore: "#e8c040",
};

/** Hand-drawn 24x24 SVG icons — no external assets, works offline. */
export function ItemIcon({ item, size = 26 }: { item: ItemId; size?: number }) {
  const def = ITEMS[item];
  const c = def.tier ? TIER_COLORS[def.tier] : "#aaa";
  let inner: React.ReactNode = null;

  switch (item) {
    case "coins":
      inner = (
        <>
          <ellipse cx="12" cy="15.5" rx="7" ry="3.6" fill="#a8802e" />
          <ellipse cx="12" cy="13" rx="7" ry="3.6" fill="#d8a840" />
          <ellipse cx="12" cy="10" rx="7" ry="3.6" fill="#f0c858" stroke="#a8802e" strokeWidth="1" />
          <text x="12" y="12.6" textAnchor="middle" fontSize="5.4" fontWeight="900" fill="#8a6420">¤</text>
        </>
      );
      break;
    case "logs":
    case "oak_logs": {
      const dark = item === "oak_logs";
      inner = (
        <>
          <rect x="4" y="9" width="16" height="8" rx="3.4" fill={dark ? "#5c3f22" : "#7a5a2e"} transform="rotate(-18 12 13)" />
          <ellipse cx="6.6" cy="14.6" rx="3.4" ry="4" fill={dark ? "#8a6a3e" : "#a8834e"} transform="rotate(-18 6.6 14.6)" />
          <ellipse cx="6.6" cy="14.6" rx="1.8" ry="2.4" fill={dark ? "#5c3f22" : "#7a5a2e"} transform="rotate(-18 6.6 14.6)" />
          <ellipse cx="17" cy="9.8" rx="3" ry="3.6" fill={dark ? "#8a6a3e" : "#a8834e"} transform="rotate(-18 17 9.8)" />
          <ellipse cx="17" cy="9.8" rx="1.5" ry="2" fill={dark ? "#5c3f22" : "#7a5a2e"} transform="rotate(-18 17 9.8)" />
        </>
      );
      break;
    }
    case "copper_ore": case "tin_ore": case "iron_ore": case "coal": case "gold_ore":
      inner = (
        <>
          <path d="M4 17 L7 7 L13 4 L20 8 L21 17 Z" fill="#5f6168" />
          <path d="M7 7 L13 4 L16 9 L9 11 Z" fill="#71747c" />
          <rect x="8" y="9" width="3.4" height="2.8" fill={ORE_COLORS[item]} />
          <rect x="14" y="7" width="3" height="2.6" fill={ORE_COLORS[item]} />
          <rect x="11" y="13" width="3.6" height="3" fill={ORE_COLORS[item]} />
        </>
      );
      break;
    case "raw_shrimp": case "shrimp": {
      const cooked = item === "shrimp";
      inner = (
        <>
          <path d="M6 14 Q6 6 13 6 Q20 6 19 12 Q18.5 16 14 16.5 L15 20 L11.4 17.4 Q6 18 6 14 Z"
            fill={cooked ? "#e8764a" : "#c9a8b0"} stroke={cooked ? "#b04a26" : "#98707c"} strokeWidth="1" />
          <path d="M10 7.6 Q14 7 16.6 9" stroke={cooked ? "#b04a26" : "#98707c"} strokeWidth="1" fill="none" />
          <circle cx="8.4" cy="11" r="0.9" fill="#2a2420" />
        </>
      );
      break;
    }
    case "raw_trout": case "trout": {
      const cooked = item === "trout";
      inner = (
        <>
          <path d="M3 12 Q8 5 15 7 L21 4 L19.6 12 L21 20 L15 17 Q8 19 3 12 Z"
            fill={cooked ? "#d8945a" : "#7a94a8"} stroke={cooked ? "#a8622e" : "#54708a"} strokeWidth="1" />
          <path d="M9 8.4 Q13 8 16 9.6" stroke={cooked ? "#a8622e" : "#54708a"} strokeWidth="1" fill="none" />
          <circle cx="6.4" cy="11" r="1" fill="#22201e" />
        </>
      );
      break;
    }
    case "bronze_bar": case "iron_bar": case "steel_bar":
      inner = (
        <>
          <path d="M4 15 L8 9 L20 9 L16 15 Z" fill={c} stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
          <path d="M8 9 L20 9 L18.4 11.4 L6.4 11.4 Z" fill="#ffffff" opacity="0.28" />
        </>
      );
      break;
    case "bronze_dagger": case "iron_dagger": case "steel_dagger":
      inner = (
        <>
          <path d="M12 2.6 L14 12 L12 14 L10 12 Z" fill="#d5dbe2" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
          <path d="M12 2.6 L14 12 L12 13 Z" fill="#aab2bc" />
          <rect x="7.4" y="12.6" width="9.2" height="2.6" rx="1.2" fill={c} />
          <rect x="10.9" y="15" width="2.2" height="5.4" rx="1" fill="#5c3f22" />
          <circle cx="12" cy="21" r="1.5" fill={c} />
        </>
      );
      break;
    case "bronze_axe": case "iron_axe": case "steel_axe": case "mithril_axe":
      inner = (
        <>
          <rect x="11" y="4" width="2.2" height="17" rx="1" fill="#7a5a2e" transform="rotate(18 12 12)" />
          <path d="M6.5 4.5 Q14 2 18.5 5.5 L17 9.5 Q12.5 6.5 7.8 8.6 Z" fill={c} stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
        </>
      );
      break;
    case "bronze_pick": case "iron_pick": case "steel_pick": case "mithril_pick":
      inner = (
        <>
          <rect x="11" y="6" width="2.2" height="15" rx="1" fill="#7a5a2e" transform="rotate(-14 12 12)" />
          <path d="M4 9 Q12 3 20 9 L18.2 11.6 Q12 7 5.8 11.6 Z" fill={c} stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
        </>
      );
      break;
    case "bones": case "big_bones": {
      const big = item === "big_bones";
      inner = (
        <g transform={`rotate(-35 12 12)${big ? " scale(1.12)" : ""}`} transform-origin="12 12">
          <rect x="5.4" y="10.4" width="13.2" height="3.2" rx="1.6" fill="#e8e2d2" stroke="#a89c84" strokeWidth="0.9" />
          <circle cx="5.8" cy="9.7" r="2.5" fill="#e8e2d2" stroke="#a89c84" strokeWidth="0.9" />
          <circle cx="5.8" cy="14.3" r="2.5" fill="#e8e2d2" stroke="#a89c84" strokeWidth="0.9" />
          <circle cx="18.2" cy="9.7" r="2.5" fill="#e8e2d2" stroke="#a89c84" strokeWidth="0.9" />
          <circle cx="18.2" cy="14.3" r="2.5" fill="#e8e2d2" stroke="#a89c84" strokeWidth="0.9" />
        </g>
      );
      break;
    }
    case "raw_beef":
      inner = (
        <>
          <path d="M4 8 Q12 4 20 8 Q22 13 19 18 Q12 22 5 18 Q2.6 13 4 8 Z" fill="#c25a52" stroke="#8a3a34" strokeWidth="1" />
          <path d="M5.4 8.8 Q12 5.6 18.6 8.8 Q17 10.6 12 10.8 Q7 10.6 5.4 8.8 Z" fill="#f0d8c8" opacity="0.85" />
        </>
      );
      break;
    case "steak":
      inner = (
        <>
          <path d="M4 8 Q12 4 20 8 Q22 13 19 18 Q12 22 5 18 Q2.6 13 4 8 Z" fill="#8a4e2e" stroke="#5c3018" strokeWidth="1" />
          <path d="M7 10.4 L17 10.4 M6.4 13.4 L17.6 13.4 M7 16.4 L16.6 16.4" stroke="#5c3018" strokeWidth="1.1" />
        </>
      );
      break;
    case "raw_chicken":
    case "cooked_chicken": {
      const cooked = item === "cooked_chicken";
      inner = (
        <>
          <path d="M6 15 Q5 8 11 6.4 Q17 5 19 9 Q21.4 13 18.6 16.6 Q14 20.6 8.6 18.6 Q6 17.6 6 15 Z"
            fill={cooked ? "#c8863a" : "#eec9a8"} stroke={cooked ? "#8a5420" : "#b08a5e"} strokeWidth="1" />
          <path d="M15 4.6 L17.6 2.6 L17.9 5.8 Z" fill={cooked ? "#c8863a" : "#eec9a8"} stroke={cooked ? "#8a5420" : "#b08a5e"} strokeWidth="0.9" />
          <path d="M9 12 Q12 11 14 13" stroke={cooked ? "#8a5420" : "#b08a5e"} strokeWidth="0.9" fill="none" />
        </>
      );
      break;
    }
    case "feather":
      inner = (
        <>
          <path d="M6 20 Q6.5 10 14 4 Q19.5 6 18.5 11 Q17 16.5 9.5 18.5 Z" fill="#f2f0e8" stroke="#b8b4a4" strokeWidth="1" />
          <path d="M7.6 18.4 Q12 12 17 6.4" stroke="#b8b4a4" strokeWidth="1" fill="none" />
        </>
      );
      break;
    case "egg":
      inner = (
        <>
          <ellipse cx="12" cy="13" rx="6" ry="7.6" fill="#f6f1e2" stroke="#c0b89e" strokeWidth="1" />
          <ellipse cx="10" cy="10.4" rx="1.6" ry="2.4" fill="#fffdf4" transform="rotate(-20 10 10.4)" />
        </>
      );
      break;
    case "fried_egg":
      inner = (
        <>
          <path d="M4.6 12 Q4 7 9 5.6 Q13 3.6 17 6 Q21 7.4 20.4 12 Q21.4 16 17 18.6 Q12 21 7.6 18.4 Q4 16.4 4.6 12 Z"
            fill="#f6f1e2" stroke="#c8c0a8" strokeWidth="1" />
          <circle cx="12.4" cy="12" r="3.6" fill="#e8b830" stroke="#c89420" strokeWidth="1" />
          <circle cx="11.4" cy="11" r="1" fill="#f6d878" />
        </>
      );
      break;
    case "fly_rod":
      inner = (
        <>
          <path d="M4 21 L19 4" stroke="#7a5a2e" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="15.6" cy="12.4" r="2.6" fill="#8a6a3e" stroke="#5c3f22" strokeWidth="1" />
          <path d="M19 4 Q21.5 8 19.6 12.5" stroke="#c9cdd6" strokeWidth="1" fill="none" />
          <circle cx="19.6" cy="13.4" r="1" fill="#e86a3a" />
        </>
      );
      break;
  }

  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: "block", filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.5))" }}>
      {inner}
    </svg>
  );
}
