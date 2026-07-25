import type { GameState } from "../game/types";
import { SKILL_BY_ID, fmt } from "../game/xp";

export function XpOrbs({ g }: { g: GameState }) {
    const now = performance.now();
    const evs = g.xpEvents.filter((e) => now - e.t < 4600).slice(-5);
    if (evs.length === 0) return null;
    return (
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-2">
        {evs.map((e) => {
            const meta = SKILL_BY_ID[e.skill];
            const age = now - e.t;
            return (
                <div
                key={e.id}
                className="flex items-center gap-2"
                style={{ opacity: age > 3600 ? Math.max(0, 1 - (age - 3600) / 1000) : 1 }}
                >
                <div
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 shadow-[0_2px_10px_rgba(0,0,0,0.6)]"
                style={{
                    borderColor: meta.color,
                    background: "radial-gradient(circle at 35% 30%, #2c2620, #141008)",
                    animation: "orbPop 0.35s ease-out",
                }}
                title={meta.name}
                >
                <span className="text-[17px] leading-none">{meta.icon}</span>
                </div>
                <div className="rounded-sm border border-[#5c4a2a]/70 bg-[#141008]/90 px-1.5 py-0.5 text-[11.5px] font-bold text-[#d8b25c] shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                +{fmt(e.amount)}
                </div>
                </div>
            );
        })}
        </div>
    );
}
