import { useEffect, useRef, useState } from "react";
import { sfx } from "../game/audio";
import { VERSION } from "../version";

interface Ember { x: number; y: number; vx: number; vy: number; s: number; ph: number; hue: number; }
interface Star { x: number; y: number; r: number; ph: number; sp: number; }

function EmberCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let w = 0, h = 0, raf = 0;
    const embers: Ember[] = [];
    const stars: Star[] = [];
    const resize = () => {
      w = canvas.width = canvas.clientWidth;
      h = canvas.height = canvas.clientHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    for (let i = 0; i < 55; i++) {
      embers.push({
        x: Math.random(), y: Math.random(),
        vx: (Math.random() - 0.5) * 0.014, vy: -(0.012 + Math.random() * 0.03),
        s: 0.8 + Math.random() * 2.2, ph: Math.random() * 9, hue: 22 + Math.random() * 26,
      });
    }
    for (let i = 0; i < 110; i++) {
      stars.push({ x: Math.random(), y: Math.random() * 0.55, r: 0.4 + Math.random() * 1.1, ph: Math.random() * 9, sp: 0.4 + Math.random() * 1.4 });
    }
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const time = t / 1000;
      ctx.clearRect(0, 0, w, h);
      for (const st of stars) {
        const a = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(time * st.sp + st.ph));
        ctx.fillStyle = `rgba(235,230,210,${a})`;
        ctx.beginPath();
        ctx.arc(st.x * w, st.y * h, st.r, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const e of embers) {
        e.x += e.vx / 60; e.y += e.vy / 60;
        if (e.y < -0.03) { e.y = 1.03; e.x = Math.random(); }
        const flicker = 0.5 + 0.5 * Math.sin(time * 6 + e.ph);
        ctx.fillStyle = `hsla(${e.hue}, 95%, ${55 + flicker * 15}%, ${0.25 + flicker * 0.5})`;
        ctx.beginPath();
        ctx.arc(e.x * w + Math.sin(time * 1.4 + e.ph) * 9, e.y * h, e.s, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}

function Emblem({ size = 92 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} style={{ filter: "drop-shadow(0 4px 18px rgba(216,178,92,0.35))" }}>
      <defs>
        <linearGradient id="goldg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6e2a8" />
          <stop offset="0.5" stopColor="#d8b25c" />
          <stop offset="1" stopColor="#8a6420" />
        </linearGradient>
        <linearGradient id="shieldg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#243420" />
          <stop offset="1" stopColor="#0e160c" />
        </linearGradient>
      </defs>
      <path d="M32 3 L57 13 V33 C57 47 46 56.5 32 61 C18 56.5 7 47 7 33 V13 Z" fill="url(#shieldg)" stroke="url(#goldg)" strokeWidth="2.6" />
      <path d="M32 8.5 L52.5 16.6 V32.6 C52.5 43.8 43.6 51.6 32 55.6 C20.4 51.6 11.5 43.8 11.5 32.6 V16.6 Z" fill="none" stroke="rgba(216,178,92,0.35)" strokeWidth="1" />
      <path d="M18 20 L30 46 M46 20 L34 46" stroke="rgba(216,178,92,0.5)" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 22 q3 -4 7 -2 M49 22 q-3 -4 -7 -2" stroke="rgba(216,178,92,0.5)" strokeWidth="2" fill="none" strokeLinecap="round" />
      <text x="32" y="41" textAnchor="middle" fontFamily="Cinzel, serif" fontWeight="900" fontSize="26" fill="url(#goldg)">F</text>
    </svg>
  );
}

export function LoginScreen({ hasSave, onStart }: { hasSave: boolean; onStart: (name: string, cont: boolean) => void }) {
  const [name, setName] = useState("Adventurer");
  const [notesOpen, setNotesOpen] = useState(false);

  const enter = (cont: boolean) => {
    sfx.click();
    onStart(name, cont);
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#0a0f0a] text-[#e0d6c0]" style={{ fontFamily: "var(--font-body)" }}>
      {/* sky */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #05080c 0%, #0a1210 34%, #14221a 58%, #23351f 76%, #2e3d20 88%, #1a2414 100%)",
        }}
      />
      {/* moon glow */}
      <div
        className="absolute right-[14%] top-[10%] h-40 w-40 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(240,236,214,0.5) 0%, rgba(240,236,214,0.12) 40%, transparent 70%)", filter: "blur(2px)" }}
      />
      <div className="absolute right-[15.6%] top-[11.5%] h-14 w-14 rounded-full bg-[#e8e4d0] opacity-80 shadow-[0_0_40px_rgba(240,236,214,0.6)]" />
      <EmberCanvas />

      {/* hill silhouettes */}
      <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ height: "46%" }}>
        <path d="M0 190 Q 220 90 460 170 T 900 150 T 1440 180 V320 H0 Z" fill="#131f10" opacity="0.9" />
        <path d="M0 240 Q 300 150 620 220 T 1440 230 V320 H0 Z" fill="#0e180b" />
        <path d="M0 285 Q 360 230 760 275 T 1440 270 V320 H0 Z" fill="#09110a" />
        <path d="M330 250 l14 -34 l14 34 Z M370 258 l11 -26 l11 26 Z M1010 262 l13 -30 l13 30 Z M1052 268 l10 -24 l10 24 Z" fill="#0b140c" />
      </svg>
      {/* torch glow at horizon */}
      <div className="absolute bottom-[24%] left-[24%] h-24 w-24 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,160,60,0.28), transparent 70%)" }} />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-10 px-5 py-12 lg:flex-row lg:gap-20">
        {/* brand */}
        <div className="flex max-w-xl flex-col items-center text-center lg:items-start lg:text-left">
          <div className="mb-5 flex items-center gap-4">
            <Emblem />
            <div className="hidden text-left sm:block">
              <p className="font-display text-[10px] font-bold tracking-[0.5em] text-[#8a7a52]">AN OFFLINE REALM</p>
              <p className="text-[11px] italic text-[#6a7a5a]">bound to no server, save, or signal</p>
            </div>
          </div>
          <div className="relative inline-block">
            <h1
              className="font-display font-black leading-none tracking-[0.03em]"
              style={{
                fontSize: "clamp(44px, 8vw, 78px)",
                background: "linear-gradient(180deg, #f8e7b0 0%, #e0bc66 42%, #8a6420 52%, #eecf82 78%, #b8903c 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                filter: "drop-shadow(0 3px 10px rgba(0,0,0,0.8)) drop-shadow(0 0 26px rgba(216,178,92,0.28))",
              }}
            >
              FORGEBOUND
            </h1>
            <h1
              aria-hidden
              className="font-display pointer-events-none absolute inset-0 font-black leading-none tracking-[0.03em]"
              style={{
                fontSize: "clamp(44px, 8vw, 78px)",
                background: "linear-gradient(115deg, transparent 42%, rgba(255,255,255,0.85) 50%, transparent 58%)",
                backgroundSize: "260% 100%",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                animation: "shineSweep 4.5s ease-in-out infinite",
              }}
            >
              FORGEBOUND
            </h1>
          </div>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#b8b098]">
            A single-player, <span className="font-bold text-[#d8b25c]">fully offline</span> action RPG in the spirit of the
            great browser MMOs. Chop, mine, fish, smelt, smith — no account, no servers, no signal.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
            {["100% offline", "Single-file build", "Autosaves to device", "Original art & names"].map((f) => (
              <span key={f} className="rounded-full border border-[#4a3c20] bg-[#12100a]/80 px-3 py-1 text-[11px] font-bold tracking-wide text-[#c8b070]">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* login card */}
        <div className="rs-panel w-full max-w-sm">
          <div className="border-b border-[#3a2f1e] px-5 py-3">
            <h2 className="font-display text-center text-[12px] font-bold tracking-[0.34em] text-[#e8c876]">ENTER THE REALM</h2>
          </div>
          <div className="flex flex-col gap-3.5 px-5 py-5">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.22em] text-[#8a7a52]">Display name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && enter(hasSave)}
                maxLength={14}
                spellCheck={false}
                className="w-full rounded-sm border border-[#4a3a20] bg-[#0d0a07] px-3 py-2.5 text-[15px] text-[#f0e6cc] outline-none transition-all focus:border-[#d8b25c] focus:shadow-[0_0_0_1px_rgba(216,178,92,0.3),0_0_18px_rgba(216,178,92,0.15)]"
              />
            </label>
            <div className="flex items-center gap-2.5 rounded-sm border border-[#2a2415] bg-[#0f0c08] px-3 py-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7ee06a] opacity-40" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#7ee06a]" />
              </span>
              <div className="flex-1">
                <p className="text-[12.5px] font-bold text-[#d8d0bc]">World 1 — Offline</p>
                <p className="text-[10.5px] text-[#6a5a3a]">Local save · zero network requests</p>
              </div>
              <span className="font-display text-[9px] font-bold tracking-widest text-[#8a7a52]">FREE</span>
            </div>
            {hasSave && (
              <button onClick={() => enter(true)} className="btn-gold">
                ⚑ &nbsp;Continue your adventure
              </button>
            )}
            <button onClick={() => enter(false)} className={hasSave ? "btn-ghost" : "btn-gold"}>
              {hasSave ? "Begin a new adventure" : "Begin your adventure"}
            </button>
            {hasSave && (
              <p className="text-center text-[10.5px] text-[#6a5a3a]">A previous save exists on this device. Starting anew will replace it.</p>
            )}
            <button
              onClick={() => setNotesOpen((o) => !o)}
              className="mt-1 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#8a7a52] transition-colors hover:text-[#d8b25c]"
            >
              <span className={`transition-transform ${notesOpen ? "rotate-90" : ""}`}>▸</span> Builder's notes
            </button>
            {notesOpen && (
              <div className="rounded-sm border border-[#2a2415] bg-[#0f0c08] p-3 text-[11.5px] leading-relaxed text-[#a89c80]" style={{ animation: "fadeIn 0.2s ease-out" }}>
                <p className="mb-1 font-bold text-[#c8b070]">Live in Gamma v{VERSION} — Gathering Fixes</p>
                <p className="mb-2">Click a tree, rock or fishing spot from anywhere and get straight to work · every ore has its own icon.</p>
                <p className="mb-1 font-bold text-[#c8b070]">v0.3.1 — Visual Repairs</p>
                <p className="mb-2">Flicker-free rendering while walking and working · clicks land on the tile under the cursor · trees and rocks stop the swing the moment they fall.</p>
                <p className="mb-1 font-bold text-[#c8b070]">Built on the Visual &amp; Animation Overhaul</p>
                <p>
                  64-bit remastered renderer with a live 8-bit⇄64-bit toggle · explorer camera zoom on the mouse wheel ·
                  a mountain-ringed realm holding Grublin Gully's goblins &amp; brigands · cows, hens, laid eggs,
                  feather-lure trout and steak · melee combat with hitsplats, loot drops and bone-burying Prayer ·
                  10 live skills · bank, shop
                  &amp; gear tiers · autosave to localStorage.
                </p>
                <p className="mb-1 mt-2 font-bold text-[#c8b070]">Roadmap</p>
                <p>Quests · more skills · an original soundtrack · pushing the mountains back for a bigger map.</p>
                <p className="mb-1 mt-2 font-bold text-[#c8b070]">Taking it offline</p>
                <p>Run <code className="rounded bg-black/50 px-1 text-[#d8b25c]">npm run build</code> — the whole game compiles to one <code className="rounded bg-black/50 px-1 text-[#d8b25c]">dist/index.html</code>. Copy that file anywhere (laptop, phone, USB stick) and open it. No server, no internet, ever.</p>
                <p className="mt-2 text-[#6a5a3a]">Inspired by classic browser MMOs. All names, art and sounds here are original.</p>
              </div>
            )}
          </div>
          <div className="border-t border-[#2a2415] px-5 py-2.5 text-center text-[10px] tracking-wide text-[#5a4c32]">
            v{VERSION} · single-player · progress lives in this browser
          </div>
        </div>
      </div>
    </div>
  );
}
