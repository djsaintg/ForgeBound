import { useEffect, useRef, useState } from "react";
import { LoginScreen } from "./components/LoginScreen";
import { WorldCanvas } from "./components/WorldCanvas";
import { Minimap } from "./components/Minimap";
import { EventFeed } from "./components/EventFeed";
import { XpOrbs } from "./components/XpOrbs";
import { SidePanels } from "./components/SidePanels";
import { BankModal, ShopModal, StationModal } from "./components/Modals";
import { LevelUpOverlay } from "./components/LevelUpOverlay";
import { ItemIcon } from "./components/ItemIcon";
import { hasSave, useGame } from "./game/useGame";
import { sfx } from "./game/audio";
import { fmt, totalLevel } from "./game/xp";

export default function App() {
  const [screen, setScreen] = useState<"login" | "game">("login");
  const [boot, setBoot] = useState<{ name: string; cont: boolean }>({ name: "Adventurer", cont: false });
  const [savedExists, setSavedExists] = useState(hasSave());

  if (screen === "login") {
    return (
      <LoginScreen
        hasSave={savedExists}
        onStart={(name, cont) => {
          setBoot({ name, cont });
          setScreen("game");
        }}
      />
    );
  }
  return (
    <GameScreen
      name={boot.name}
      cont={boot.cont}
      onExit={() => {
        setSavedExists(hasSave());
        setScreen("login");
      }}
    />
  );
}

function GameScreen({ name, cont, onExit }: { name: string; cont: boolean; onExit: () => void }) {
  const api = useGame();
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(sfx.isMuted());
  const [savedTick, setSavedTick] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const rc = useRef(0);
  rc.current++;

  useEffect(() => {
    api.start(name, cont);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounced autosave whenever the UI state changed
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      if (api.saveNow()) setSavedTick((k) => k + 1);
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rc.current]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") api.closeOverlays();
    };
    const onUnload = () => api.saveNow();
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0c0a07]">
        <p className="font-display animate-pulse text-sm font-bold tracking-[0.4em] text-[#8a7a52]">ENTERING FORGEBOUND…</p>
      </div>
    );
  }

  const g = api.g();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0c0a07] text-[#e0d6c0]">
      {/* top bar */}
      <header className="flex h-11 shrink-0 items-center gap-2.5 border-b border-[#3a2f1e] bg-gradient-to-b from-[#1c1610] to-[#120e09] px-3">
        <span
          className="font-display text-[17px] font-black tracking-[0.06em]"
          style={{
            background: "linear-gradient(180deg, #f6e2a8, #d8b25c 55%, #96702a)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          FORGEBOUND
        </span>
        <span className="hidden items-center gap-1.5 rounded-full border border-[#2a3a1e] bg-[#0e140a] px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#9ac07a] sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-[#7ee06a]" />
          WORLD 1 · OFFLINE
        </span>
        <div className="flex-1" />
        <span className="hidden items-center gap-1.5 text-[12px] font-bold text-[#7ee06a] sm:flex">
          {g.name}
          <span className="text-[#6a5a3a]">·</span>
          <span className="text-[#c8b070]">Total {totalLevel(g.xp)}</span>
        </span>
        <span className="flex items-center gap-1 rounded-sm border border-[#3a2418] bg-[#160e08] px-2 py-0.5 text-[11.5px] font-bold text-[#ff8a72]">
          ♥ {g.hp}/{g.maxHp}
        </span>
        <span className="flex items-center gap-1 rounded-sm border border-[#3a2f14] bg-[#14100a] px-2 py-0.5 text-[11.5px] font-bold text-[#f0c858]">
          <ItemIcon item="coins" size={13} /> {fmt(g.coins)}
        </span>
        <button
          key={savedTick}
          className="hidden text-[10.5px] font-bold text-[#7ac06a] md:block"
          style={{ animation: savedTick ? "savedFlash 2.2s ease-out forwards" : undefined }}
          title="Progress autosaves to this device"
        >
          ✓ {savedTick ? "Saved" : "Autosave on"}
        </button>
        <button
          onClick={() => { sfx.setMuted(!muted); setMuted(!muted); }}
          className="flex h-7 w-7 items-center justify-center rounded-sm border border-[#3a2f1e] text-[13px] transition-colors hover:border-[#8a6a2e]"
          title={muted ? "Sound off" : "Sound on"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
        <button
          onClick={() => setShowPanel((s) => !s)}
          className="flex h-7 items-center rounded-sm border border-[#3a2f1e] px-2 text-[11px] font-bold text-[#c8b070] md:hidden"
        >
          ☰
        </button>
        <button
          onClick={() => {
            if (window.confirm("Leave the world? Your progress is saved to this device.")) {
              api.saveNow();
              onExit();
            }
          }}
          className="hidden h-7 items-center rounded-sm border border-[#3a2f1e] px-2.5 text-[11px] font-bold tracking-wide text-[#a8905a] transition-colors hover:border-[#8a3a2a] hover:text-[#ff8a72] sm:flex"
        >
          LEAVE
        </button>
      </header>

      {/* world + side panel */}
      <div className="relative flex min-h-0 flex-1 gap-2 p-2">
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-md border border-[#5c4a2a]/80 bg-black shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]">
          <WorldCanvas api={api} />
          <XpOrbs g={g} />
          <div className="pointer-events-none absolute right-2.5 top-2.5">
            <Minimap api={api} />
          </div>
        </div>
        <div className="hidden w-[290px] shrink-0 md:block">
          <SidePanels api={api} g={g} />
        </div>
        {showPanel && (
          <div className="absolute inset-y-2 right-2 z-30 w-[280px] md:hidden" style={{ animation: "modalIn 0.18s ease-out" }}>
            <SidePanels api={api} g={g} />
          </div>
        )}
        <StationModal api={api} g={g} />
        <BankModal api={api} g={g} />
        <ShopModal api={api} g={g} />
        <LevelUpOverlay api={api} g={g} />
      </div>

      {/* adventurer's log */}
      <div className="h-[158px] shrink-0 px-2 pb-2">
        <EventFeed g={g} />
      </div>
    </div>
  );
}
