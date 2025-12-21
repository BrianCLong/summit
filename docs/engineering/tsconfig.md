# TypeScript configuration baseline

This repository standardises on a single `tsconfig.base.json` so that every package inherits the same strict defaults and path aliases.

## Baseline defaults

`tsconfig.base.json` contains the canonical compiler options:

- `module`/`target`: `ESNext`/`ES2022` with `moduleResolution` set to `Bundler` for modern ESM builds, with packages free to tighten this (e.g., Node16) when needed.
- `strict` mode with `noImplicitOverride` and `noUncheckedIndexedAccess` enabled; `exactOptionalPropertyTypes` is held at `false` for compatibility.
- Interop helpers: `esModuleInterop`, `allowSyntheticDefaultImports`, `resolveJsonModule`, `isolatedModules`, and incremental build info (`tsBuildInfoFile`).
- DOM + modern ECMAScript libs, default `typeRoots` covering local `types/` plus shared `../types/shims`.
- Canonical aliases: `@/*` → `./src/*` and the `zod/v4` shim pointing at `types/shims/zod-v4.d.ts` (with a parent-directory fallback for packages).
- Monorepo-wide excludes for generated assets: `**/dist`, `**/build`, `**/.turbo`, and `**/.next`.
- Shared shims under `types/shims/` provide ambient globals and permissive module declarations so typechecking can proceed even when the npm registry is unavailable.

## Package-level configs

Package `tsconfig.json` files should:

1. `extends: "../tsconfig.base.json"` (or the correct relative path).
2. Set `compilerOptions.baseUrl` to the package root.
3. Add only package-specific options (e.g., `noEmit`, `outDir`, `types`, or additional `paths`).
4. Keep `include` focused on source and type definition files, and `exclude` for `node_modules` and build outputs.

### Client

- Extends the base, keeps `allowJs` for mixed source files, and enforces `noEmit` for Vite/React builds.
- Relaxes `noImplicitAny` locally to tolerate shimmed dependencies when the registry is unavailable; revisit once full type packages are restored.
- Aliases `@/*` to `src/*` locally and keeps the `zod/v4` shim pointing to shared types.
- Includes `types/**/*.d.ts` while excluding generated build artifacts and noisy test fixture folders.

### Server

- Extends the base with Node16 resolution, `rootDir`/`outDir` for emitted JS, and `downlevelIteration` for runtime compatibility.
- Aliases `@/*` to server `src` and consumes the shared `zod/v4` shim.
- Includes `src`, `tests`, and `health` while excluding `dist` and `node_modules`.

## Drift detection

A lightweight validator (`pnpm lint:tsconfig`) runs `scripts/check-tsconfig.js` to ensure package configs keep extending the base, avoid overriding canonical compiler options, and maintain expected include/exclude patterns. Run it locally before opening a PR to catch drift early.
