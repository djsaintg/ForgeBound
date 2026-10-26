import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ItemId } from "../game/types";
import type { GameApi } from "../game/useGame";
import { ItemIcon } from "./ItemIcon";

/** dataTransfer type carrying a dragged backpack slot index. */
export const SLOT_MIME = "application/x-forgebound-slot";

/** Touch: how far (px) a finger must move before a press becomes a drag. */
const TOUCH_DRAG_PX = 8;

/**
 * Where a dragged backpack item lands, judged by the element it's let go over:
 * - a backpack slot (`data-slot`): move it there, swapping with what's there
 * - the bank window (`data-drop="bank"`): deposit it
 * - other panels (`data-drop="keep"`): nothing, it stays put
 * - anywhere else (the world, the log, a window's backdrop): drop it on the ground
 */
export function dropSlotOn(api: GameApi, from: number, el: Element | null) {
  const zone = el?.closest("[data-slot], [data-drop]");
  if (zone instanceof HTMLElement && zone.dataset.slot !== undefined) api.moveSlot(from, Number(zone.dataset.slot));
  else if (zone instanceof HTMLElement && zone.dataset.drop === "bank") api.depositSlot(from);
  else if (!zone) api.dropSlot(from);
}

/** Lets a backpack item dragged with the mouse be let go anywhere on the page. */
export function useSlotDropAnywhere(api: GameApi) {
  useEffect(() => {
    const carrying = (e: DragEvent) => !!e.dataTransfer?.types.includes(SLOT_MIME);
    const onOver = (e: DragEvent) => { if (carrying(e)) e.preventDefault(); };
    const onDrop = (e: DragEvent) => {
      if (!carrying(e)) return;
      e.preventDefault();
      dropSlotOn(api, Number(e.dataTransfer!.getData(SLOT_MIME)), e.target as Element);
    };
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [api]);
}

/** Mouse drag props for a backpack slot. */
export const slotDragProps = (i: number, has: boolean) => ({
  "data-slot": i,
  draggable: has,
  onDragStart: (e: React.DragEvent) => {
    e.dataTransfer.setData(SLOT_MIME, String(i));
    e.dataTransfer.effectAllowed = "move";
  },
});

/**
 * Touch drag for a backpack slot: press and slide to carry the item, with a
 * copy of it under the finger, and let go where it should land. Holding
 * still instead is left to the long-press menu.
 */
export function useTouchSlotDrag(api: GameApi, i: number, item: ItemId | undefined) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const dragged = useRef(false);
  return {
    handlers: {
      onPointerDown: (e: React.PointerEvent) => {
        dragged.current = false;
        if (e.pointerType !== "touch" || !item) return;
        start.current = { x: e.clientX, y: e.clientY };
      },
      onPointerMove: (e: React.PointerEvent) => {
        const s = start.current;
        if (!s) return;
        if (!dragging.current && Math.hypot(e.clientX - s.x, e.clientY - s.y) > TOUCH_DRAG_PX) {
          dragging.current = true;
          try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* moves still arrive */ }
        }
        if (dragging.current) setAt({ x: e.clientX, y: e.clientY });
      },
      onPointerUp: (e: React.PointerEvent) => {
        if (dragging.current) {
          dragged.current = true;
          dropSlotOn(api, i, document.elementFromPoint(e.clientX, e.clientY));
        }
        start.current = null;
        dragging.current = false;
        setAt(null);
      },
      onPointerCancel: () => {
        start.current = null;
        dragging.current = false;
        setAt(null);
      },
    },
    /** True right after a drag, so the click that follows is ignored. */
    dragged: () => dragged.current,
    // Portalled to <body>: a pressed slot is scaled, which would throw off a fixed position inside it
    ghost: at && item ? createPortal(
      <div
        className="pointer-events-none fixed z-50 opacity-90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]"
        style={{ left: at.x - 18, top: at.y - 42 }}
      >
        <ItemIcon item={item} size={36} />
      </div>,
      document.body
    ) : null,
  };
}
