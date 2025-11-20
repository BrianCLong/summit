#!/usr/bin/env node

/**
 * Summit CLI - Unified entry point for IntelGraph Summit platform
 *
 * This CLI consolidates 300+ scripts, 25+ CLI tools, and multiple build systems
 * into a single, discoverable interface suitable for both humans and AI agents.
 */

import { main } from '../src/index.js';

// Handle uncaught errors gracefully
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

// Run the CLI
main(process.argv).catch((err) => {
  console.error(err.message || err);
  process.exit(err.exitCode || 1);
});
