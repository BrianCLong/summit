# Hello World Plugin

A minimal example plugin demonstrating Summit plugin architecture.

## Overview

This plugin shows how to:

- Initialize a plugin with the `PluginBuilder` API
- Handle lifecycle events (init, start, stop, destroy)
- Implement health checks
- Use plugin storage
- Subscribe to platform events
- Write tests using `PluginTestHarness`

## Installation

```bash
# Install dependencies
npm install

# Build the plugin
npm run build

# Run tests
npm test
```

## Usage

### As a Standalone Plugin

```typescript
import { createHelloWorldPlugin } from "@summit-plugins/hello-world";

// Create with default configuration
const plugin = createHelloWorldPlugin();

// Or customize configuration
const customPlugin = createHelloWorldPlugin({
  greeting: "Welcome to my app!",
  enableEventLogging: false,
});
```

### Configuration Options

| Option               | Type      | Default                       | Description                        |
| -------------------- | --------- | ----------------------------- | ---------------------------------- |
| `greeting`           | `string`  | `"Hello from Summit Plugin!"` | Message logged on initialization   |
| `enableEventLogging` | `boolean` | `true`                        | Whether to log all platform events |

## Plugin Lifecycle

```
┌─────────────┐
│  Created    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Initialize  │ ◄── Context available, storage accessible
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Start     │ ◄── Event subscriptions, background tasks
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Running    │ ◄── Health checks available
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Stop     │ ◄── Cleanup, unsubscribe events
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Destroy    │ ◄── Final cleanup
└─────────────┘
```

## Testing

This plugin includes comprehensive tests demonstrating the `PluginTestHarness`:

```typescript
import { createTestHarness } from "@intelgraph/plugin-sdk";
import { createHelloWorldPlugin } from "./index";

const harness = createTestHarness({
  pluginId: "hello-world",
  version: "1.0.0",
});

// Load and test the plugin
await harness.load(createHelloWorldPlugin());
await harness.initialize();
await harness.start();

// Check logs
const logs = harness.getLogger().getLogs();
console.log(logs);

// Check health
const health = await harness.healthCheck();
console.log(health);

// Run full lifecycle test
const result = await harness.runLifecycleTest();
console.log(result.passed ? "All tests passed!" : "Tests failed");
```

## Publishing

```bash
# Validate the plugin
summit plugin validate

# Publish to marketplace (dry run)
summit plugin publish --dry-run

# Publish for real
summit plugin publish
```

## Project Structure

```
hello-world-plugin/
├── manifest.json      # Plugin manifest
├── package.json       # npm package config
├── tsconfig.json      # TypeScript config
├── jest.config.json   # Jest config
├── src/
│   └── index.ts       # Plugin implementation
├── tests/
│   └── plugin.test.ts # Plugin tests
└── README.md          # This file
```

## License

MIT
