"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Touch drag-and-drop that mirrors the existing native HTML5 DnD.
 *
 * Native HTML5 DnD (draggable + onDragStart/onDrop) does not fire on touch
 * devices, so this hook adds a parallel path built on Pointer Events. It only
 * handles `pointerType === "touch"` — mouse/pen pointers fall through untouched
 * so the existing HTML5 DnD (and the <select> fallbacks) keep working exactly
 * as before.
 *
 * Wiring:
 *  - Spread the object returned by the binder onto each draggable element,
 *    passing the payload id it carries: `<div {...bind(item.id)} draggable>`.
 *  - Mark every drop target with a `data-drop-id="…"` attribute. On release we
 *    read the element under the finger via `document.elementFromPoint`, walk up
 *    to the nearest `[data-drop-id]`, and call `onDrop(payloadId, dropId)` — the
 *    same handler the HTML5 `onDrop` already uses.
 */

export const DROP_ID_ATTR = "data-drop-id";

export interface UseTouchDragOptions {
  /** Invoked when a touch drag is released over an element carrying data-drop-id. */
  onDrop: (payloadId: string, dropId: string) => void;
  /** Optional: fired when a touch drag begins (e.g. to dim the source). */
  onDragStart?: (payloadId: string) => void;
  /** Optional: fired when a touch drag ends (dropped or cancelled). */
  onDragEnd?: (payloadId: string) => void;
}

interface ActiveDrag {
  payloadId: string;
  pointerId: number;
  clone: HTMLElement;
  offsetX: number;
  offsetY: number;
  overEl: HTMLElement | null;
  prevOutline: string;
  prevOutlineOffset: string;
}

/** Binder props spread onto a draggable element. */
export interface TouchDragHandleProps {
  onPointerDown: (e: React.PointerEvent) => void;
}

export function useTouchDrag({
  onDrop,
  onDragStart,
  onDragEnd,
}: UseTouchDragOptions): (payloadId: string) => TouchDragHandleProps {
  const dragRef = useRef<ActiveDrag | null>(null);
  const teardownRef = useRef<(() => void) | null>(null);

  // Clean up a drag that is still in flight if the component unmounts.
  useEffect(() => () => teardownRef.current?.(), []);

  const start = useCallback(
    (e: React.PointerEvent, payloadId: string) => {
      // Only handle touch — let native HTML5 DnD own mouse/pen.
      if (e.pointerType !== "touch") return;
      // Ignore a second finger while a drag is already running.
      if (dragRef.current) return;
      // Don't hijack the accessible <select> fallback (or any nested control)
      // when the finger lands on it — those must stay tappable on touch.
      const origin = e.target as HTMLElement | null;
      if (
        origin?.closest(
          "select, option, input, textarea, button, a, [contenteditable]",
        )
      ) {
        return;
      }

      const source = e.currentTarget as HTMLElement;
      const rect = source.getBoundingClientRect();

      // A floating clone that follows the finger for visual feedback.
      const clone = source.cloneNode(true) as HTMLElement;
      clone.setAttribute("aria-hidden", "true");
      clone.removeAttribute("id");
      Object.assign(clone.style, {
        position: "fixed",
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        margin: "0",
        pointerEvents: "none",
        opacity: "0.9",
        transform: "scale(1.03)",
        boxShadow: "0 10px 28px rgba(0,0,0,0.28)",
        zIndex: "9999",
        touchAction: "none",
      } satisfies Partial<CSSStyleDeclaration>);
      document.body.appendChild(clone);

      const drag: ActiveDrag = {
        payloadId,
        pointerId: e.pointerId,
        clone,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        overEl: null,
        prevOutline: "",
        prevOutlineOffset: "",
      };
      dragRef.current = drag;
      onDragStart?.(payloadId);

      const findDrop = (x: number, y: number): HTMLElement | null => {
        const el = document.elementFromPoint(x, y);
        if (!el) return null;
        return (el as HTMLElement).closest<HTMLElement>(`[${DROP_ID_ATTR}]`);
      };

      const setOver = (el: HTMLElement | null) => {
        if (drag.overEl === el) return;
        if (drag.overEl) {
          drag.overEl.style.outline = drag.prevOutline;
          drag.overEl.style.outlineOffset = drag.prevOutlineOffset;
        }
        drag.overEl = el;
        if (el) {
          drag.prevOutline = el.style.outline;
          drag.prevOutlineOffset = el.style.outlineOffset;
          el.style.outline = "2px solid var(--accent)";
          el.style.outlineOffset = "2px";
        }
      };

      const move = (ev: PointerEvent) => {
        if (ev.pointerId !== drag.pointerId) return;
        // Prevent the page from scrolling under the finger mid-drag.
        ev.preventDefault();
        drag.clone.style.left = `${ev.clientX - drag.offsetX}px`;
        drag.clone.style.top = `${ev.clientY - drag.offsetY}px`;
        setOver(findDrop(ev.clientX, ev.clientY));
      };

      const teardown = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        document.removeEventListener("pointercancel", cancel);
        setOver(null);
        drag.clone.remove();
        if (dragRef.current === drag) dragRef.current = null;
        teardownRef.current = null;
      };

      const finish = (ev: PointerEvent, shouldDrop: boolean) => {
        if (ev.pointerId !== drag.pointerId) return;
        let dropId: string | null = null;
        if (shouldDrop) {
          dropId = findDrop(ev.clientX, ev.clientY)?.getAttribute(DROP_ID_ATTR) ?? null;
        }
        teardown();
        if (dropId) onDrop(drag.payloadId, dropId);
        onDragEnd?.(drag.payloadId);
      };

      const up = (ev: PointerEvent) => finish(ev, true);
      const cancel = (ev: PointerEvent) => finish(ev, false);

      // passive:false so move() can call preventDefault to block scrolling.
      document.addEventListener("pointermove", move, { passive: false });
      document.addEventListener("pointerup", up);
      document.addEventListener("pointercancel", cancel);
      teardownRef.current = teardown;
    },
    [onDrop, onDragStart, onDragEnd],
  );

  return useCallback(
    (payloadId: string): TouchDragHandleProps => ({
      onPointerDown: (e: React.PointerEvent) => start(e, payloadId),
    }),
    [start],
  );
}
