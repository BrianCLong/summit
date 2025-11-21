/**
 * Summit Extensions Framework
 *
 * Main entry point for the extension system.
 */

// Core types
export * from './types.js';

// Core classes
export { ExtensionRegistry } from './registry.js';
export { ExtensionLoader } from './loader.js';
export type { LoaderOptions } from './loader.js';

// Policy enforcement
export { PolicyEnforcer } from './policy/enforcer.js';
export type { PolicyDecision } from './policy/enforcer.js';

// Integrations
export { CopilotIntegration } from './integrations/copilot.js';
export type { CopilotTool, CopilotSkill } from './integrations/copilot.js';

export { CommandPaletteIntegration } from './integrations/command-palette.js';
export type { UICommand, UIWidget } from './integrations/command-palette.js';

export { CLIIntegration } from './integrations/cli.js';
export type { CLICommand, CLIArgument, CLIOption } from './integrations/cli.js';

// Extension Manager - High-level API
export { ExtensionManager } from './manager.js';
export type { ExtensionManagerOptions } from './manager.js';
