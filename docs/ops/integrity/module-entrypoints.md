# Module Integrity Entrypoints

This document lists the primary entrypoints for the module integrity checker to scan when verifying import/export paths.

## Client Entrypoints

- `client/src/main.jsx` - Main client application entry point
- `client/src/App.router.jsx` - Client routing and application shell

## Server Entrypoints

- `server/index.ts` - Main server application entry point
- `server/server.ts` - Server application logic

## Package Entrypoints

The repository uses a pnpm monorepo structure with multiple packages in:

- `packages/*/src` - Individual package source directories

All source roots are automatically scanned for import/export integrity issues.
