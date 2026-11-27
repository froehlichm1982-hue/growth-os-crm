import { useEffect } from 'react';

// dnd-kit stamps aria-pressed / aria-grabbed on every draggable. Those states
// are not allowed on the role=group the table, board and page-layout cells use
// (axe aria-allowed-attr), and aria-roledescription needs a supporting role.
// The drag instructions stay linked through aria-describedby.
const STRIP = ['aria-pressed', 'aria-grabbed'];
const SELECTOR = '[aria-roledescription="draggable"]';

const sweep = (root: ParentNode) => {
  root.querySelectorAll<HTMLElement>(SELECTOR).forEach((element) => {
    if (element.getAttribute('role') === 'button') return;
    STRIP.forEach((name) => element.removeAttribute(name));
    if (element.getAttribute('role') === 'group') {
      element.removeAttribute('aria-roledescription');
    }
  });
};

export const GrowthOsDndA11y = () => {
  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        sweep(document);
      });
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-pressed', 'aria-grabbed', 'aria-roledescription'],
    });
    schedule();
    return () => {
      observer.disconnect();
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
};
