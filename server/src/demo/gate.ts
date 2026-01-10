/**
 * @file server/src/demo/gate.ts
 * @description Hard gate utility to check if DEMO_MODE is enabled.
 */

/**
 * Checks if the application is running in Demo Mode.
 * This is a hard gate: if false, no demo functionality should operate.
 *
 * @param env - Optional environment object (defaults to process.env)
 * @returns true if DEMO_MODE is 'true', false otherwise.
 */
export function isDemoEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.DEMO_MODE === 'true';
}
