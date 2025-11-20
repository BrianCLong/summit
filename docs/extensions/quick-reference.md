# Extensions Quick Reference

## Installation & Setup

```bash
# One-command installation:
cp -r my-extension /path/to/summit/extensions/
cd /path/to/summit/extensions/my-extension
pnpm install && pnpm build
summit-ext reload
```

## Manifest Schema (extension.json)

```json
{
  "name": "my-extension",              // Required: kebab-case identifier
  "displayName": "My Extension",       // Required: Human-readable name
  "version": "1.0.0",                  // Required: Semantic version
  "description": "...",                // Required
  "type": "tool",                      // Required: connector|widget|command|tool|analyzer|integration
  "capabilities": [...],               // Required: Array of capability strings
  "permissions": [...],                // Required: Array of permission strings
  "entrypoints": { ... }               // Required: Named entrypoints
}
```

## Extension Types

- **connector**: Data ingestion/export
- **widget**: UI visualization
- **command**: UI/CLI commands
- **tool**: Copilot tools
- **analyzer**: Data analysis
- **integration**: External service integration

## Capabilities

### Data
- `data.ingestion` - Ingest data
- `data.export` - Export data
- `data.transform` - Transform data

### UI
- `ui.widget` - UI widget
- `ui.command` - UI command
- `ui.panel` - UI panel

### Copilot
- `copilot.tool` - Copilot tool
- `copilot.skill` - Copilot skill

### Other
- `analytics` - Analytics
- `enrichment` - Data enrichment
- `api.provider` - API provider
- `webhook` - Webhook handler

## Permissions

### Data Access
- `entities:read` - Read entities
- `entities:write` - Create/update entities
- `relationships:read` - Read relationships
- `relationships:write` - Create relationships
- `investigations:read` - Read investigations
- `investigations:write` - Create/update investigations

### System Access
- `network:access` - Network access (⚠️ requires approval)
- `fs:read` - File system read
- `fs:write` - File system write (⚠️ requires approval)
- `commands:execute` - Execute commands (⚠️ requires approval)

### API Access
- `api:access` - Access Summit API
- `webhook:register` - Register webhooks
- `user:data` - Access user data

## Extension Code

### Main Activation Function

```typescript
import type { ExtensionContext, ExtensionActivation } from '@summit/extensions';

export async function activate(context: ExtensionContext): Promise<ExtensionActivation> {
  const { logger, config, api, extensionPath, storagePath } = context;

  logger.info('Activating...');

  // Initialize extension...

  return {
    dispose: async () => {
      logger.info('Deactivating...');
      // Cleanup...
    },
    exports: {
      // Public API
    }
  };
}
```

### Context API

```typescript
// Entities
await api.entities.create({ type: 'person', name: 'John' });
await api.entities.update(id, { name: 'Jane' });
await api.entities.delete(id);
const entities = await api.entities.query({ type: 'person' });

// Relationships
await api.relationships.create({ from: id1, to: id2, type: 'knows' });
const rels = await api.relationships.query({ type: 'knows' });

// Investigations
const inv = await api.investigations.create({ title: 'Investigation' });
const data = await api.investigations.get(invId);
await api.investigations.update(invId, { status: 'active' });

// Storage (persistent)
await api.storage.set('key', { data: 'value' });
const data = await api.storage.get('key');
await api.storage.delete('key');

// HTTP (if network:access granted)
const res = await api.http?.get('https://api.example.com/data');
await api.http?.post('https://api.example.com/data', { key: 'val' });

// Logger
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message');
logger.debug('Debug message');
```

## Copilot Tools

### Manifest

```json
"copilot": {
  "tools": [{
    "name": "my-tool",
    "description": "What the tool does",
    "parameters": {
      "type": "object",
      "properties": {
        "param1": { "type": "string", "description": "..." }
      },
      "required": ["param1"]
    },
    "entrypoint": "myTool"
  }]
}
```

### Implementation

```typescript
// src/tools/my-tool.ts
export async function myTool(params: { param1: string }) {
  const { param1 } = params;
  // Tool logic...
  return result;
}
```

### Entrypoint Reference

```json
"entrypoints": {
  "myTool": {
    "type": "function",
    "path": "dist/tools/my-tool.js",
    "export": "myTool"
  }
}
```

## UI Commands

### Manifest

```json
"ui": {
  "commands": [{
    "id": "my-command",
    "title": "My Command",
    "icon": "📊",
    "category": "Analytics",
    "entrypoint": "myCommand"
  }]
}
```

### Implementation

```typescript
// src/commands/my-command.ts
export async function myCommand() {
  // Command logic...
}
```

## CLI Commands

### Manifest

```json
"cli": {
  "commands": [{
    "name": "analyze",
    "description": "Run analysis",
    "entrypoint": "analyzeCmd",
    "arguments": [{
      "name": "input",
      "description": "Input file",
      "required": true,
      "type": "string"
    }],
    "options": [{
      "name": "output",
      "alias": "o",
      "description": "Output file",
      "type": "string",
      "default": "output.json"
    }]
  }]
}
```

### Implementation

```typescript
// src/commands/analyze.ts
export async function analyzeCmd(
  args: { input: string },
  options: { output: string }
) {
  // Command logic...
}
```

### Usage

```bash
summit-ext exec my-extension:analyze input.json --output results.json
```

## Configuration

Create `.summit/extensions/config/{extension-name}.json`:

```json
{
  "option1": "value1",
  "option2": "value2"
}
```

Access in extension:

```typescript
const { config } = context;
const option1 = config.option1;
```

## CLI Commands

```bash
# List extensions
summit-ext list
summit-ext list --verbose

# Show extension details
summit-ext show my-extension

# Extension statistics
summit-ext stats

# Reload extensions
summit-ext reload

# Execute extension command
summit-ext exec my-extension:command [args...]

# Install from path
summit-ext install ./my-extension
```

## File Structure

```
my-extension/
├── extension.json       # Manifest
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts        # Main activation
│   ├── tools/          # Copilot tools
│   ├── commands/       # UI/CLI commands
│   └── utils/          # Utilities
└── dist/               # Build output
```

## Development Workflow

```bash
# Create from template
cp -r packages/extensions/templates/basic my-extension

# Install dependencies
pnpm install

# Development (watch mode)
pnpm dev

# Build
pnpm build

# Test locally
summit-ext load ./my-extension
summit-ext list
# Test functionality...
summit-ext reload  # After changes
```

## Common Patterns

### Async Initialization

```typescript
export async function activate(context: ExtensionContext) {
  const { logger, api } = context;

  // Load initial data
  const data = await api.storage.get('cached-data');

  if (!data) {
    logger.info('Initializing data...');
    const initialData = await fetchInitialData();
    await api.storage.set('cached-data', initialData);
  }

  return { dispose: async () => {} };
}
```

### Periodic Tasks

```typescript
export async function activate(context: ExtensionContext) {
  const { logger, config } = context;

  const interval = setInterval(async () => {
    logger.debug('Running periodic task...');
    await performTask();
  }, config.intervalMs || 60000);

  return {
    dispose: async () => {
      clearInterval(interval);
    }
  };
}
```

### Error Handling

```typescript
export async function myTool(params: any) {
  try {
    validateParams(params);
    const result = await performOperation(params);
    return result;
  } catch (err) {
    console.error('Tool failed:', err);
    throw new Error(`Operation failed: ${err.message}`);
  }
}
```

## Troubleshooting

### Extension not loading
- Check `extension.json` is valid JSON
- Verify entrypoint paths exist
- Run `pnpm build`
- Check logs: Look for error messages

### Permission denied
- Add required permission to manifest
- Check OPA policy
- Contact admin for approval

### Tool not in copilot
- Add `copilot.tool` to capabilities
- Verify entrypoint is correct
- Reload: `summit-ext reload`

### Command not in palette
- Add `ui.command` to capabilities
- Check entrypoint is correct
- Reload: `summit-ext reload`

## Examples

See complete examples:
- **Analytics Dashboard**: `extensions/examples/analytics-dashboard/`
- **Basic Template**: `packages/extensions/templates/basic/`

## Documentation

- **Full Guide**: [Building Extensions for Summit](./building-extensions.md)
- **API Reference**: [Extension API Reference](./api-reference.md)
- **Manifest Schema**: `packages/extensions/src/types.ts`
