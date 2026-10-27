import { useEffect, useRef } from "react";
import type { GameApi } from "../game/useGame";
import type { Action, GameState } from "../game/types";
import { FOES, ITEMS, RECIPES, RESOURCES } from "../game/data";

const GATHER_VERB: Record<string, string> = { woodcutting: "Chopping", mining: "Mining", fishing: "Fishing at" };
const STATION_VERB: Record<string, string> = { furnace: "Smelting", anvil: "Smithing", fire: "Cooking" };

function foeName(g: GameState, a: Extract<Action, { kind: "combat" }>): string {
  if (a.targetKind === "cow") return "the pasture cow";
  if (a.targetKind === "chicken") return "the coop hen";
  const f = g.foes?.find((x) => x.id === a.targetId);
  return f ? `the ${FOES[f.foe].name}` : "the foe";
}

/** What the hero is doing right now, or null when idle. */
function describe(g: GameState): { text: string; walking: boolean } | null {
  const a = g.action;
  if (!a) return null;
  const walking = g.path.length > 0;
  if (a.kind === "combat") return { text: `${walking ? "Chasing" : "Fighting"} ${foeName(g, a)}`, walking };
  if (a.kind === "gather") {
    const def = RESOURCES[a.res];
    const what = def.name.toLowerCase();
    return walking
      ? { text: `Heading to the ${what}`, walking }
      : { text: `${GATHER_VERB[def.skill] ?? "Gathering"} ${def.skill === "fishing" ? "the " : ""}${what}`, walking };
  }
  const r = RECIPES.find((x) => x.id === a.recipe);
  const item = r ? ITEMS[r.output]?.name.toLowerCase() : "";
  return { text: `${(r && STATION_VERB[r.station]) ?? "Crafting"} ${item}`.trim(), walking };
}

/**
 * The "Chopping tree…" banner with a live progress bar. Driven by its own
 * animation frame (like the minimap) so the bar tracks the action timer
 * smoothly without re-rendering React every frame.
 */
export function ActionBanner({ api }: { api: GameApi }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let lastText = "";
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const g = api.gref.current;
      const box = boxRef.current, text = textRef.current, bar = barRef.current;
      if (!g || !box || !text || !bar) return;
      const d = describe(g);
      if (!d) {
        box.style.opacity = "0";
        lastText = "";
        return;
      }
      box.style.opacity = "1";
      const label = `${d.text}…`;
      if (label !== lastText) {
        text.textContent = label;
        lastText = label;
      }
      const a = g.action!;
      const pct = d.walking ? 0 : Math.min(1, a.progress / a.cycle);
      bar.style.width = `${(pct * 100).toFixed(1)}%`;
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [api]);

  return (
    <div
      ref={boxRef}
      className="w-full overflow-hidden rounded-sm border border-[#5c4a2a]/80 bg-[#141008]/75 shadow-[0_2px_10px_rgba(0,0,0,0.55)] backdrop-blur-[2px] transition-opacity duration-200"
      style={{ opacity: 0 }}
    >
      <span ref={textRef} className="block truncate px-2 py-1 text-center text-[11px] font-bold text-[#e8c876] [text-shadow:0_1px_2px_#000]" />
      <div className="h-[3px] bg-[#0c0906]">
        <div ref={barRef} className="h-full bg-gradient-to-r from-[#8a6420] to-[#f0c858]" style={{ width: 0 }} />
      </div>
    </div>
  );
}
