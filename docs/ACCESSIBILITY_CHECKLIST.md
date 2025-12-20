## Accessibility checklist for new UI

- **Route changes are announced** through the shared ARIA live region and update focus to the primary content container to preserve keyboard context.
- **Modal dialogs restore focus** to the triggering control (or a defined fallback) and trap focus while open to avoid keyboard traps.
- **Focus order is predictable**: primary page `<main>` is focusable on navigation, and new interactive elements follow a logical tab sequence.
- **Keyboard support is complete** for all controls (no mouse-only behaviors) and skip/close actions are reachable via keyboard shortcuts.
- **Axe smoke tests are added/updated** to cover new routes or views; serious/critical violations are triaged before merge.
- **Forms and inputs include labels, descriptions, and error messaging** that are conveyed programmatically (ARIA or native semantics).
- **Color contrast and state changes** meet WCAG 2.1 AA; ensure hover/focus states remain perceivable.
- **Animations and auto-updating regions** respect user preferences (e.g., reduced motion) and avoid unexpected focus shifts.
- **Documentation and test plans** for new features mention accessibility considerations, including how to run the `npm run test:a11y` check locally.
