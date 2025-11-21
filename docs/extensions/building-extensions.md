# Building Extensions for Summit

This guide explains how to build extensions for Summit using the unified extension framework.

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Extension Manifest](#extension-manifest)
4. [Extension Lifecycle](#extension-lifecycle)
5. [Capabilities](#capabilities)
6. [Permissions](#permissions)
7. [Integration Points](#integration-points)
8. [Testing](#testing)
9. [Publishing](#publishing)
10. [Best Practices](#best-practices)

## Overview

Summit extensions allow you to:

- Add new data connectors and analyzers
- Create custom UI widgets and commands
- Expose tools and skills to the AI copilot
- Add CLI commands
- Integrate external services

Extensions are:

- **Self-contained**: Each extension is a complete package with its own dependencies
- **Declarative**: Capabilities are declared in a manifest file
- **Type-safe**: Full TypeScript support
- **Policy-enforced**: Permissions are enforced via OPA policies
- **Hot-reloadable**: Extensions can be updated without restarting Summit

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- TypeScript 5+
- Summit installed and running

### Create a New Extension

1. **Copy the template**:

```bash
cd /path/to/summit
cp -r packages/extensions/templates/basic extensions/my-extension
cd extensions/my-extension
```

2. **Update the manifest**:

Edit `extension.json` to set your extension name, description, and capabilities.

3. **Install dependencies**:

```bash
pnpm install
```

4. **Write your code**:

Edit `src/index.ts` to implement your extension logic.

5. **Build**:

```bash
pnpm build
```

6. **Test**:

```bash
# Load your extension into Summit
summit ext load .
summit ext list
```

## Extension Manifest

The `extension.json` file declares your extension's metadata and capabilities.

### Basic Structure

```json
{
  "name": "my-extension",
  "displayName": "My Extension",
  "version": "1.0.0",
  "description": "What this extension does",
  "author": "Your Name",
  "license": "MIT",
  "type": "tool",
  "capabilities": ["copilot.tool"],
  "permissions": ["entities:read"],
  "entrypoints": {
    "main": {
      "type": "function",
      "path": "dist/index.js",
      "export": "activate"
    }
  }
}
```

### Manifest Fields

#### Identity

- **name** (required): Unique identifier (kebab-case, e.g., `my-extension`)
- **displayName** (required): Human-readable name
- **version** (required): Semantic version (e.g., `1.0.0`)
- **description** (required): Brief description
- **author**: Extension author
- **license**: License identifier (e.g., `MIT`, `Apache-2.0`)

#### Type and Capabilities

- **type** (required): Primary extension type
  - `connector` - Data ingestion/export
  - `widget` - UI visualization
  - `command` - UI/CLI commands
  - `tool` - Copilot tools
  - `analyzer` - Data analysis
  - `integration` - External service integration

- **capabilities** (required): Array of capabilities
  - `data.ingestion` - Ingest data
  - `data.export` - Export data
  - `data.transform` - Transform data
  - `ui.widget` - UI widget
  - `ui.command` - UI command
  - `ui.panel` - UI panel
  - `copilot.tool` - Copilot tool
  - `copilot.skill` - Copilot skill
  - `analytics` - Analytics
  - `enrichment` - Data enrichment
  - `api.provider` - API provider
  - `webhook` - Webhook handler

#### Permissions

- **permissions**: Array of required permissions
  - `entities:read` - Read entities
  - `entities:write` - Create/update entities
  - `relationships:read` - Read relationships
  - `relationships:write` - Create relationships
  - `investigations:read` - Read investigations
  - `investigations:write` - Create/update investigations
  - `network:access` - Network access
  - `fs:read` - File system read
  - `fs:write` - File system write
  - `commands:execute` - Execute shell commands
  - `api:access` - Access Summit API
  - `webhook:register` - Register webhooks
  - `user:data` - Access user data

#### Entrypoints

Entrypoints define how to invoke your extension code:

```json
"entrypoints": {
  "main": {
    "type": "function",
    "path": "dist/index.js",
    "export": "activate",
    "handler": "optional-method-name"
  },
  "myTool": {
    "type": "function",
    "path": "dist/tools/my-tool.js",
    "export": "default"
  }
}
```

- **type**: `function`, `class`, `http`, or `cli`
- **path**: Relative path to the module
- **export**: Named export (or `default`)
- **handler**: Optional method name to invoke

## Extension Lifecycle

### Activation

Your extension's `activate` function is called when Summit loads it:

```typescript
import type { ExtensionContext, ExtensionActivation } from '@summit/extensions';

export async function activate(context: ExtensionContext): Promise<ExtensionActivation> {
  const { logger, config, api, extensionPath, storagePath } = context;

  logger.info('Extension activating...');

  // Initialize your extension
  // ...

  return {
    dispose: async () => {
      logger.info('Extension deactivating...');
      // Clean up resources
    },
    exports: {
      // Public API for other extensions
      myFunction: () => 'Hello!',
    },
  };
}
```

### Extension Context

The context provides:

- **extensionPath**: Absolute path to your extension directory
- **storagePath**: Persistent storage directory for your extension
- **config**: Configuration object (from `.summit/extensions/config/{name}.json`)
- **logger**: Logger interface (`info`, `warn`, `error`, `debug`)
- **api**: Summit API interface

### Extension API

Access Summit functionality via `context.api`:

```typescript
// Entities
const entities = await api.entities.query({ type: 'person' });
await api.entities.create({ type: 'person', name: 'John Doe' });
await api.entities.update(id, { name: 'Jane Doe' });
await api.entities.delete(id);

// Relationships
await api.relationships.create({ from: id1, to: id2, type: 'knows' });
const rels = await api.relationships.query({ type: 'knows' });

// Investigations
const inv = await api.investigations.create({ title: 'New Investigation' });
const invData = await api.investigations.get(invId);
await api.investigations.update(invId, { status: 'active' });

// Storage (persistent key-value store for your extension)
await api.storage.set('myKey', { data: 'value' });
const data = await api.storage.get('myKey');
await api.storage.delete('myKey');

// HTTP client (if network:access permission granted)
const response = await api.http?.get('https://api.example.com/data');
await api.http?.post('https://api.example.com/data', { key: 'value' });
```

## Capabilities

### Copilot Tools

Expose functions as copilot tools:

```json
"copilot": {
  "tools": [
    {
      "name": "search-entities",
      "description": "Search for entities by name",
      "parameters": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "Search query"
          }
        },
        "required": ["query"]
      },
      "entrypoint": "searchTool"
    }
  ]
}
```

Implement the tool:

```typescript
// src/tools/search.ts
export async function searchEntities(params: { query: string }) {
  const { query } = params;
  // Search logic...
  return results;
}
```

### UI Commands

Add commands to the UI command palette:

```json
"ui": {
  "commands": [
    {
      "id": "show-dashboard",
      "title": "Show My Dashboard",
      "icon": "📊",
      "category": "Analytics",
      "entrypoint": "showDashboard"
    }
  ]
}
```

### UI Widgets

Add widgets to the UI:

```json
"ui": {
  "widgets": [
    {
      "id": "my-widget",
      "title": "My Widget",
      "component": "MyWidgetComponent",
      "placement": "dashboard"
    }
  ]
}
```

### CLI Commands

Add CLI commands:

```json
"cli": {
  "commands": [
    {
      "name": "analyze",
      "description": "Run analysis",
      "entrypoint": "analyzeCommand",
      "arguments": [
        {
          "name": "input",
          "description": "Input file",
          "required": true,
          "type": "string"
        }
      ],
      "options": [
        {
          "name": "output",
          "alias": "o",
          "description": "Output file",
          "type": "string",
          "default": "output.json"
        }
      ]
    }
  ]
}
```

Implement the command:

```typescript
// src/commands/analyze.ts
export async function analyzeCommand(
  args: { input: string },
  options: { output: string }
) {
  const { input } = args;
  const { output } = options;
  // Command logic...
}
```

## Permissions

### Request Minimum Permissions

Only request permissions you actually need:

```json
"permissions": [
  "entities:read",
  "network:access"
]
```

### Permission Policy

Permissions are enforced by OPA policies. Dangerous permissions (network access, file system writes, command execution) require explicit approval.

Default policy location: `packages/extensions/src/policy/default-policy.rego`

## Integration Points

### Copilot Integration

Extensions are automatically registered with the copilot:

```typescript
// The copilot can now call your tools
// User: "Search for entities named 'Acme'"
// Copilot calls: searchEntities({ query: 'Acme' })
```

### UI Integration

Commands appear in the command palette:

1. User opens command palette (Cmd/Ctrl+P)
2. User searches for your command
3. Command executes your entrypoint function

### CLI Integration

Commands are available via the CLI:

```bash
summit ext my-extension:analyze input.json --output results.json
```

## Testing

### Manual Testing

```bash
# Build your extension
pnpm build

# Load it into Summit
summit ext load /path/to/my-extension

# List loaded extensions
summit ext list

# Test copilot integration
# Ask the copilot to use your tool

# Test UI integration
# Open command palette and search for your command

# Test CLI integration
summit ext my-extension:my-command

# Reload after changes
summit ext reload

# Unload
summit ext unload my-extension
```

### Automated Testing

Create tests using Jest or your preferred framework:

```typescript
// src/index.test.ts
import { activate } from './index.js';

describe('My Extension', () => {
  it('activates successfully', async () => {
    const context = createMockContext();
    const activation = await activate(context);
    expect(activation).toBeDefined();
  });
});
```

### Development Workflow

1. Make changes to your code
2. Run `pnpm build` (or `pnpm dev` for watch mode)
3. Run `summit ext reload` to reload all extensions
4. Test your changes

## Publishing

### Internal Publishing

1. **Package your extension**:

```bash
pnpm pack
```

2. **Publish to internal registry**:

```bash
pnpm publish --registry https://your-registry.com
```

3. **Install**:

```bash
cd /path/to/summit/extensions
pnpm add @summit-extensions/my-extension
summit ext install my-extension
```

### One-Command Installation

The acceptance criteria is: "You can add a new extension by dropping a package + manifest into the right place and running one command."

```bash
# Drop your extension directory into extensions/
cp -r my-extension /path/to/summit/extensions/

# Build and install
cd /path/to/summit/extensions/my-extension
pnpm install && pnpm build

# Extension is auto-discovered on next Summit restart
# Or reload immediately:
summit ext reload
```

## Best Practices

### Security

1. **Request minimum permissions**: Only ask for what you need
2. **Validate input**: Always validate user input
3. **Sanitize output**: Prevent XSS and injection attacks
4. **Use HTTPS**: Always use secure connections
5. **Handle secrets safely**: Use environment variables or secure storage

### Performance

1. **Lazy load**: Only load resources when needed
2. **Cache data**: Cache expensive operations
3. **Debounce events**: Avoid excessive API calls
4. **Use streams**: Process large datasets incrementally
5. **Clean up**: Properly dispose of resources

### Error Handling

1. **Graceful degradation**: Handle errors without crashing
2. **Informative messages**: Provide clear error messages
3. **Logging**: Use the logger for debugging
4. **Retry logic**: Implement retries for transient failures

### Code Organization

```
my-extension/
├── extension.json          # Manifest
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts           # Main activation
│   ├── tools/             # Copilot tools
│   ├── commands/          # UI/CLI commands
│   ├── widgets/           # UI components
│   ├── utils/             # Utilities
│   └── types/             # Type definitions
└── tests/
    └── index.test.ts
```

### Documentation

1. **README**: Explain what your extension does and how to use it
2. **Inline comments**: Document complex logic
3. **Type definitions**: Use TypeScript for self-documenting code
4. **Examples**: Provide usage examples

## Examples

See the complete example extension:

- **Analytics Dashboard**: `extensions/examples/analytics-dashboard/`

Key features demonstrated:
- Multiple entrypoints
- Copilot tools
- UI commands
- CLI commands
- Configuration
- Storage
- Proper cleanup

## Troubleshooting

### Extension not loading

1. Check manifest is valid JSON
2. Verify entrypoint paths are correct
3. Check for build errors: `pnpm build`
4. Review logs: `summit ext logs my-extension`

### Permission denied

1. Check required permissions in manifest
2. Review OPA policy
3. Contact admin for permission approval

### Tool not appearing in copilot

1. Verify capability includes `copilot.tool`
2. Check entrypoint is defined correctly
3. Reload extensions: `summit ext reload`

## API Reference

Full API documentation: [Extension API Reference](./api-reference.md)

## Support

- GitHub Issues: https://github.com/summit/summit/issues
- Documentation: https://docs.summit.io/extensions
- Examples: `extensions/examples/`

## Next Steps

1. Review the example extension: `extensions/examples/analytics-dashboard/`
2. Copy the template: `packages/extensions/templates/basic/`
3. Build your extension
4. Share it with the team!
