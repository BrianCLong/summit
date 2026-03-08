"use strict";
/**
 * @file server/src/demo/gate.ts
 * @description Hard gate utility to check if DEMO_MODE is enabled.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDemoEnabled = isDemoEnabled;
/**
 * Checks if the application is running in Demo Mode.
 * This is a hard gate: if false, no demo functionality should operate.
 *
 * @param env - Optional environment object (defaults to process.env)
 * @returns true if DEMO_MODE is 'true', false otherwise.
 */
function isDemoEnabled(env = process.env) {
    return env.DEMO_MODE === 'true';
}
