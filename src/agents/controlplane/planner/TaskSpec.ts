/**
 * TaskSpec — re-export for convenience so callers can import from planner/.
 *
 * The canonical definition lives in router/RouterTypes.ts to avoid circular
 * imports, since the router also uses it.
 *
 * EVD-AFCP-ARCH-001
 */
export type { TaskSpec } from "../router/RouterTypes.js";
