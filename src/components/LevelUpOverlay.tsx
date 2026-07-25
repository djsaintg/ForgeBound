import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { SKILL_BY_ID } from "../game/xp";

export function LevelUpOverlay({ api, g }: { api: GameApi; g: GameState }) {
  const lu = g.levelUps[0];
  if (!lu) return null;
  const meta = SKILL_BY_ID[lu.skill];
  return (
    <div
      className="absolute inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/55"
      onClick={api.dismissLevelUp}
      style={{ animation: "fadeIn 0.2s ease-out" }}
    >
      <div className="relative flex flex-col items-center px-6 text-center">
        <div
          className="absolute -inset-24 rounded-full opacity-60"
          style={{
            background: "radial-gradient(circle, rgba(216,178,92,0.35) 0%, rgba(216,178,92,0.08) 45%, transparent 70%)",
            animation: "burst 0.7s ease-out",
          }}
        />
        <div
          className="absolute -inset-16 opacity-25"
          style={{
            background:
              "repeating-conic-gradient(rgba(240,210,130,0.9) 0deg 6deg, transparent 6deg 18deg)",
            borderRadius: "50%",
            animation: "spinSlow 14s linear infinite",
          }}
        />
        <div style={{ animation: "modalIn 0.3s cubic-bezier(0.2, 1.4, 0.4, 1)" }} className="relative flex flex-col items-center">
          <div
            className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border-[3px] text-[30px] shadow-[0_0_30px_rgba(216,178,92,0.5)]"
            style={{ borderColor: meta.color, background: "radial-gradient(circle at 35% 30%, #34291a, #141008)" }}
          >
            {meta.icon}
          </div>
          <p className="font-display text-[13px] font-bold tracking-[0.3em] text-[#c8b070]">CONGRATULATIONS</p>
          <h2 className="font-display mt-1 text-[26px] font-black leading-tight text-[#f4e3b2] [text-shadow:0_2px_14px_rgba(216,178,92,0.55)]">
            You've advanced a {meta.name} level!
          </h2>
          <p className="mt-2 text-[15px] text-[#d8d0bc]">
            Your {meta.name.toLowerCase()} level is now{" "}
            <span className="font-display text-[20px] font-black text-[#e8c876]">{lu.level}</span>
          </p>
          <p className="mt-5 text-[11px] uppercase tracking-[0.2em] text-[#8a7a52]">click to continue</p>
        </div>
      </div>
    </div>
  );
}
