
# Extension Ecosystem

This directory contains the foundational components for the Summit Extension Ecosystem.

## Components

- `types.ts`: Defines the `ExtensionManifest`, `ExtensionPermission`, and other core types.
- `registry.ts`: A registry service (currently in-memory) to manage installed extensions.
- `sandbox.ts`: A sandbox wrapper to execute extension code safely (prototype).

## Creating an Extension

An extension is defined by a `manifest.json` (or object) adhering to `ExtensionManifest`.

```json
{
  "id": "com.partner.analytics",
  "name": "Partner Analytics",
  "version": "1.0.0",
  "description": "Custom analytics dashboard",
  "permissions": ["read:graph"],
  "entryPoint": "https://api.partner.com/webhook"
}
```

## Security

Extensions must be isolated. The `ExtensionSandbox` provides a wrapper to enforce timeouts and permission checks.
Future iterations will run extensions in isolated environments (e.g., WebAssembly or separate containers).
