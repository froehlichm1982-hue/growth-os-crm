import { type RefObject, useEffect, useRef } from 'react';

// DS drawer behaviour as a React hook (the equivalent of design-system js/gos.js,
// which the CRM does not load; see PATCHES.md, DS v2.9): on mobile a closed drawer is inert + aria-hidden; while open
// focus is trapped, Esc closes it, and focus returns to the control that
// opened it.
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export const useGrowthOsDrawerA11y = (
  ref: RefObject<HTMLElement | null>,
  isMobile: boolean,
  isOpen: boolean,
  close: () => void,
) => {
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!isMobile) {
      el.removeAttribute('inert');
      el.removeAttribute('aria-hidden');
      return;
    }
    if (!isOpen) {
      el.setAttribute('inert', '');
      el.setAttribute('aria-hidden', 'true');
      if (opener.current && document.contains(opener.current)) {
        opener.current.focus();
      }
      opener.current = null;
      return;
    }
    el.removeAttribute('inert');
    el.removeAttribute('aria-hidden');
    const active = document.activeElement;
    opener.current =
      active instanceof HTMLElement && !el.contains(active) ? active : null;
    el.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (node) => node.offsetParent !== null,
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [ref, isMobile, isOpen, close]);
};
