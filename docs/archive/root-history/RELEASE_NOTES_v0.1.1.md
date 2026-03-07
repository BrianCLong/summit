# Release v0.1.1: Observability foundation

**Date:** 2025-11-22

## Summary

Observability foundation with typed logging, Prometheus metrics, health tests, and fixes.

## Changes

### Added

- **Observability Infrastructure**
  - Typed Logger interface compatible with pino/winston
  - Centralized metrics facade with prom-client
  - Prometheus `/metrics` endpoint with health tests
  - Application-specific metrics for jobs, connections, database queries, and HTTP requests

- **Scripts**
  - `test:quick` script for pre-push hook validation

### Fixed

- **TypeScript Type Safety**
  - Resolved prom-client import and typing issues (TS2551, TS2694, TS2339)
  - Fixed Prometheus API response type assertions in canary guard
  - Improved type safety across metrics and logging infrastructure

- **Git Hooks & Configuration**
  - Fixed husky v10 deprecation warnings by removing deprecated initialization
  - Fixed commitlint ESM compatibility (renamed config to .cjs)
  - Added test coverage directories to .gitignore

- **Code Quality**
  - Fixed import ordering across search-engine and web apps
  - Removed unused imports from components and services
  - Fixed stopword module imports for TypeScript compatibility
  - Added error logging to exporter service
  - Added dist directory to exporter ESLint ignore patterns

### Changed

- Standardized prom-client imports using default export pattern
- Improved error handling in export service

### Known Issues

- 7 minor logger typing warnings in OutboxNeo4jSync.ts (non-critical, pino logger signature compatibility)
