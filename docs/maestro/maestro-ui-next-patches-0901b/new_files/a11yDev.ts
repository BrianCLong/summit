// Lightweight dev-only a11y checker using @axe-core/react. No prod impact.
// Enable by setting: window.__MAESTRO_CFG__.a11y = 'on'
export default async function enableA11yIfWanted(React: any, ReactDOM: any) {
  try {
    if (process.env.NODE_ENV === "development") {
      const cfg = (window as any).__MAESTRO_CFG__ || {};
      if (cfg.a11y === "on") {
        const axe = await import("@axe-core/react");
        axe.default(React, ReactDOM, 1000);
        // eslint-disable-next-line no-console
        console.log("[A11y] axe-core/react enabled");
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[A11y] axe not enabled:", e);
  }
}
