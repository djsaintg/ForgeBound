import React, { useEffect, useRef } from "react";
import type { GameState } from "../game/types";
import { Scroll } from "lucide-react";

interface Props {
  g: GameState;
}

const KIND_STYLE: Record<string, string> = {
  sys: "text-[#f0c858] font-bold",
  npc: "text-[#9fd8ef]",
  err: "text-[#ff8a72]",
  info: "text-[#b8b098]",
};

export const EventFeed: React.FC<Props> = ({ g }) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [g.chat.length]);

  return (
    <div className="rs-panel flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 border-b border-[#3a2f1e] px-3 py-1.5">
        <Scroll className="h-3.5 w-3.5 text-[#d8b25c]" />
        <span className="font-display text-[10px] font-bold uppercase tracking-[0.28em] text-[#c8b070]">
          Adventurer's Log
        </span>
        <span className="ml-auto text-[9.5px] font-mono text-[#6a5a3a]">{g.chat.length} entries</span>
      </div>
      <div className="chat-scroll flex-1 space-y-0.5 overflow-y-auto px-3 py-1.5 font-mono text-[11.5px] leading-snug">
        {g.chat.length === 0 && (
          <p className="py-3 text-center italic text-[#6a5a3a]">The chronicle awaits your first deed…</p>
        )}
        {g.chat.map((m) => (
          <p
            key={m.id}
            className={KIND_STYLE[m.kind] ?? KIND_STYLE.info}
            style={{ animation: "feedIn 0.18s ease-out" }}
          >
            {m.text}
          </p>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
