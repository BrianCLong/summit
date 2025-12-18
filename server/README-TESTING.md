# Server Testing Guide

## ESM Configuration

The server codebase uses ECMA Script Modules (ESM) and Jest with `ts-jest` for testing.
Due to ESM requirements, Jest must be run with specific Node.js options.

### Running Tests

To run tests locally:

```bash
cd server
npm test
```

This script automatically sets `NODE_OPTIONS="--experimental-vm-modules --max-old-space-size=8192"`.

If you run `jest` directly via `npx`, you must set these options:

```bash
cd server
NODE_OPTIONS="--experimental-vm-modules --max-old-space-size=8192" npx jest
```

### Mocking

- **Global Mocks**: `ioredis` and `pg` are mocked globally in `server/__mocks__`.
- **ESM Mocking**: Use `jest.mock()` in test files if needed, but be aware of hoisting limitations in ESM. Prefer `__mocks__` or `jest.unstable_mockModule` (if available/needed).
- **Imports**: Ensure all imports in test files use proper extensions or are handled by `jest.config.ts` mapping.

### Troubleshooting

- **OOM Errors**: If you see "JavaScript heap out of memory", ensure `NODE_OPTIONS` includes `--max-old-space-size=8192`.
- **Import Errors**: "Cannot use import statement outside a module" usually means `NODE_OPTIONS="--experimental-vm-modules"` is missing.
