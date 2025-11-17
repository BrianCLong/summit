/**
 * Imports the server configuration to trigger production guardrails.
 * If required env vars are unsafe this module will terminate with exit 1.
 */
import '../../server/src/config.ts';

console.log('[prod-config-check] configuration loaded successfully');
