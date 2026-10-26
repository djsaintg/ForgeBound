import { useEffect, useRef } from "react";
import type { GameApi } from "../game/useGame";
import type { GameState, NpcId } from "../game/types";
import { drawTownsfolk } from "../game/render";
import { NPC_NAME } from "../game/quests";

/** The NPC's own in-game figure, framed head and shoulders and gently animated. */
function Portrait({ npc }: { npc: NpcId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = 64;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      // A figure drawn at ~2.4 tiles tall, shifted up so the head and chest fill the frame
      drawTownsfolk(ctx, npc === "maro", size / 2, 6, 120, t);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [npc]);
  return <canvas ref={ref} style={{ width: 64, height: 64 }} className="block" />;
}

/**
 * The conversation box along the bottom of the world view. Click the text (or
 * press Space / Enter) to read on; on the last page, pick a reply with a click
 * or its number key.
 */
export function DialogueBox({ api, g }: { api: GameApi; g: GameState }) {
  const d = g.dialogue;

  useEffect(() => {
    if (!d) return;
    const onKey = (e: KeyboardEvent) => {
      const onLast = d.page >= d.pages.length - 1;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!onLast || !d.options.length) api.dialogueNext();
      } else if (onLast && /^[1-9]$/.test(e.key)) {
        api.dialogueChoose(Number(e.key) - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api, d, d?.page, d?.id]);

  if (!d) return null;
  const onLast = d.page >= d.pages.length - 1;
  const showOptions = onLast && d.options.length > 0;

  return (
    <div
      key={d.id}
      data-drop="keep"
      className="rs-panel absolute inset-x-2.5 bottom-2.5 z-30 mx-auto flex max-w-2xl gap-3 p-3"
      style={{ animation: "modalIn 0.16s ease-out" }}
    >
      <div className="shrink-0 overflow-hidden rounded-sm border border-[#6a5428] bg-gradient-to-b from-[#2a2014] to-[#120d08]">
        <Portrait npc={d.npc} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="font-display text-[11px] font-bold tracking-[0.18em] text-[#e8c876]">{NPC_NAME[d.npc].toUpperCase()}</span>
          <button
            onClick={api.endTalk}
            title="End conversation (Esc)"
            className="flex h-5 w-5 items-center justify-center rounded-sm border border-[#4a3a20] text-[10px] text-[#a8905a] transition-colors hover:border-[#d8b25c] hover:text-[#e8c876]"
          >
            ✕
          </button>
        </div>
        <button
          onClick={() => { if (!showOptions) api.dialogueNext(); }}
          className={`mt-1 block w-full text-left text-[13px] leading-snug text-[#e0d6c0] ${showOptions ? "cursor-default" : "cursor-pointer"}`}
        >
          {d.pages[d.page]}
        </button>
        {showOptions ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {d.options.map((o, i) => (
              <button
                key={i}
                onClick={() => api.dialogueChoose(i)}
                className="rounded-sm border border-[#4a3a20] bg-[#1a140c] px-2.5 py-1 text-left text-[12px] text-[#f0c858] transition-colors hover:border-[#d8b25c] hover:bg-[#2a2010]"
              >
                <span className="mr-1.5 text-[10px] text-[#8a7a52]">{i + 1}</span>
                {o.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-1.5 text-right text-[10.5px] text-[#8a7a52]">
            {onLast ? "Click or press Space to finish" : "Click or press Space to continue ▸"}
          </div>
        )}
      </div>
    </div>
  );
}
