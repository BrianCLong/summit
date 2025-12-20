# Basic Webhook Adapter Template

This template scaffolds a minimal webhook adapter that works with the `adapter-sdk` contract
harness. It demonstrates how to expose adapter metadata and a `handleEvent` implementation that
receives webhook payloads.

## Getting started

```bash
pnpm install
pnpm run build
pnpm exec adapter-sdk test --entry dist/adapter.js
```

## Files

- `src/adapter.ts`: Entry point implementing the `handleEvent` contract.
- `tsconfig.json`: TypeScript configuration aligned to the IntelGraph defaults.
- `package.json`: Includes `build` and placeholder `test` scripts.

## Customization

- Update `metadata` to reflect your adapter name and capabilities.
- Extend `handleEvent` to map incoming payloads to your webhook or downstream service.
- Add unit tests under `src/` and wire them into the `test` script.
