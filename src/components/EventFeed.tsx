import { useEffect, useRef } from "react";
import type { ChatKind, GameState } from "../game/types";

const KIND_STYLE: Record<ChatKind, { text: string; dot: string }> = {
  sys: { text: "text-[#ffe14a]", dot: "#e8c876" },
  info: { text: "text-[#cfc8b8]", dot: "#8a7a52" },
  npc: { text: "text-[#9fd8ef]", dot: "#5a9db8" },
  err: { text: "text-[#ff8a72]", dot: "#c25a44" },
};

/** Highlights every occurrence of the adventurer's name in a log line. */
function Rich({ text, name }: { text: string; name: string }) {
  if (!name) return <>{text}</>;
  const parts = text.split(name);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && (
            <span className="font-bold text-[#7ee06a]">{name}</span>
          )}
        </span>
      ))}
    </>
  );
}

/**
 * The Adventurer's Log — a read-only chronicle of in-game events.
 * Oldest deeds at the top, newest at the bottom; the view always follows
 * the newest line, pushing older ones up and out of the way.
 * (Follow is keyed to the newest message id, not the entry count — the log
 * is capped at 90 entries, so the count alone goes stale once full.)
 */
export function EventFeed({ g }: { g: GameState }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const latest = g.chat[g.chat.length - 1];
  const latestId = latest?.id ?? 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [latestId]);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-md border border-[#5c4a2a]/80 bg-[#171310]/95 shadow-[inset_0_0_24px_rgba(0,0,0,0.7)]">
      <div className="flex items-center justify-between border-b border-[#3a2f1e] px-3 py-1">
        <span className="font-display text-[10px] font-bold tracking-[0.24em] text-[#a8905a]">
          ADVENTURER'S LOG
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-[#6a5a3a]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#7ee06a]" />
          WORLD 1 · OFFLINE
        </span>
      </div>
      <div
        ref={scrollRef}
        className="chat-scroll min-h-0 flex-1 overflow-y-auto px-3 py-1.5 text-[12.5px] leading-[1.5]"
      >
        {g.chat.map((m) => {
          const st = KIND_STYLE[m.kind];
          const isNew = latest !== undefined && m.id === latest.id;
          return (
            <p
              key={m.id}
              className={`flex gap-2 ${st.text} ${isNew ? "" : "opacity-90"}`}
              style={isNew ? { animation: "feedIn 0.3s ease-out" } : undefined}
            >
              <span
                className="mt-[6px] inline-block h-1.5 w-1.5 shrink-0 rotate-45"
                style={{ background: st.dot }}
              />
              <span className="min-w-0">
                <Rich text={m.text} name={g.name} />
              </span>
            </p>
          );
        })}
      </div>
    </div>
  );
}
