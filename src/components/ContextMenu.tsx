import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MenuOption } from "../game/types";

/** How far (px) the mouse may stray from the menu before it closes on its own. */
const STRAY = 56;
/** Touch: hold this long (ms) to open the menu. */
const LONG_PRESS = 480;

interface MenuState {
  x: number;
  y: number;
  options: MenuOption[];
}

type OpenMenu = (x: number, y: number, options: MenuOption[]) => void;

const MenuCtx = createContext<OpenMenu>(() => {});

/** Opens the shared right-click menu at a screen point. */
export const useContextMenu = () => useContext(MenuCtx);

/**
 * Holds the one right-click menu for the game screen. `onChoose` runs after
 * an option, so the React panels pick up whatever it changed.
 */
export function ContextMenuProvider({ onChoose, children }: { onChoose: () => void; children: React.ReactNode }) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const open = useCallback<OpenMenu>((x, y, options) => {
    if (options.length) setMenu({ x, y, options });
  }, []);
  return (
    <MenuCtx.Provider value={open}>
      {children}
      {menu && (
        <Menu
          menu={menu}
          onClose={() => setMenu(null)}
          onChoose={(o) => {
            setMenu(null);
            o.run();
            onChoose();
          }}
        />
      )}
    </MenuCtx.Provider>
  );
}

function Menu({ menu, onClose, onChoose }: { menu: MenuState; onClose: () => void; onChoose: (o: MenuOption) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: menu.x, y: menu.y });

  // Keep the menu on screen: centred on the cursor like the classic menu, nudged in from the edges
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const x = Math.max(4, Math.min(window.innerWidth - width - 4, menu.x - width / 2));
    const y = Math.max(4, Math.min(window.innerHeight - height - 4, menu.y - 10));
    setPos({ x, y });
  }, [menu]);

  useEffect(() => {
    const inside = (e: MouseEvent | PointerEvent) => ref.current?.contains(e.target as Node);
    // A left-click elsewhere only dismisses the menu: swallow the click it
    // turns into, so it doesn't also walk the hero off somewhere
    const onDown = (e: PointerEvent) => {
      if (inside(e)) return;
      onClose();
      if (e.button !== 0) return;
      const swallow = (c: MouseEvent) => { c.stopPropagation(); c.preventDefault(); };
      window.addEventListener("click", swallow, { capture: true, once: true });
      window.setTimeout(() => window.removeEventListener("click", swallow, true), 700);
    };
    const onMove = (e: MouseEvent) => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      if (e.clientX < r.left - STRAY || e.clientX > r.right + STRAY || e.clientY < r.top - STRAY || e.clientY > r.bottom + STRAY) onClose();
    };
    // Escape closes only the menu, not the windows or held item behind it
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onClose();
    };
    // Capture, so a click elsewhere closes the menu before it does anything else
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("blur", onClose);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("blur", onClose);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
      className="rs-panel fixed z-50 min-w-[150px] max-w-[300px] overflow-hidden py-0.5"
      style={{ left: pos.x, top: pos.y, animation: "fadeIn 0.08s ease-out" }}
    >
      <div className="font-display border-b border-[#3a2f1e] px-2.5 pb-1 pt-0.5 text-[9.5px] font-bold uppercase tracking-[0.2em] text-[#8a7a52]">
        Choose option
      </div>
      {menu.options.map((o, i) => (
        <button
          key={i}
          role="menuitem"
          onClick={() => onChoose(o)}
          className="block w-full truncate px-2.5 py-[3px] text-left text-[12px] text-[#e0d6c0] transition-colors hover:bg-[#3a2f14] focus:bg-[#3a2f14] focus:outline-none"
        >
          {o.label}
          {o.target && <span className="font-bold text-[#f0c858]"> {o.target}</span>}
        </button>
      ))}
    </div>
  );
}

/**
 * Touch support: holding a finger still opens the menu, like a right-click.
 * Returns pointer handlers to spread on the element, and `fired()` to tell
 * the click that follows a long press to do nothing.
 */
export function useLongPress(onLong: (x: number, y: number) => void) {
  const timer = useRef(0);
  const start = useRef({ x: 0, y: 0 });
  const didFire = useRef(false);
  const cancel = () => window.clearTimeout(timer.current);
  return {
    handlers: {
      onPointerDown: (e: React.PointerEvent) => {
        didFire.current = false;
        if (e.pointerType !== "touch") return;
        const { clientX: x, clientY: y } = e;
        start.current = { x, y };
        cancel();
        timer.current = window.setTimeout(() => { didFire.current = true; onLong(x, y); }, LONG_PRESS);
      },
      onPointerMove: (e: React.PointerEvent) => {
        if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) cancel();
      },
      onPointerUp: cancel,
      onPointerCancel: cancel,
    },
    fired: () => didFire.current,
  };
}
