# Summit Extensions & Ecosystem Framework

Comprehensive extension system for Summit enabling developers to extend platform capabilities through a unified, policy-enforced framework.

## 📋 Overview

The Summit Extensions Framework provides:

- **Unified Extension System**: Single manifest format for all extension types
- **Multi-Channel Integration**: Copilot tools, UI commands/widgets, and CLI
- **Policy Enforcement**: Permission-based access control via OPA
- **Hot Reload**: Update extensions without restarting Summit
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Developer Experience**: Templates, CLI tools, and comprehensive documentation

## 🚀 Quick Start

### Installation (One Command!)

```bash
# Copy extension to extensions directory
cp -r my-extension /path/to/summit/extensions/
cd /path/to/summit/extensions/my-extension

# Install and build
pnpm install && pnpm build

# Extension is now available!
```

### Your First Extension

```bash
# 1. Create from template
cd /path/to/summit
cp -r packages/extensions/templates/basic extensions/hello-world
cd extensions/hello-world

# 2. Edit extension.json (set name, description, capabilities)

# 3. Edit src/index.ts (implement your logic)

# 4. Build
pnpm install && pnpm build

# 5. Test
summit-ext list
summit-ext show hello-world
```

## 📚 Documentation

- **[Building Extensions](./building-extensions.md)**: Complete guide to building extensions
- **[Quick Reference](./quick-reference.md)**: Cheat sheet for common tasks
- **[API Reference](./api-reference.md)**: Full API documentation *(to be created)*

## 🏗️ Architecture

### Components

```
packages/extensions/
├── src/
│   ├── types.ts              # Core types and manifest schema
│   ├── loader.ts             # Extension discovery and loading
│   ├── registry.ts           # Extension registry
│   ├── manager.ts            # High-level API
│   ├── policy/
│   │   ├── enforcer.ts       # Policy enforcement
│   │   └── default-policy.rego # Default OPA policy
│   ├── integrations/
│   │   ├── copilot.ts        # Copilot integration
│   │   ├── command-palette.ts # UI integration
│   │   └── cli.ts            # CLI integration
│   └── server-integration.ts # Server/API integration
├── templates/
│   └── basic/                # Basic extension template
├── cli.ts                    # CLI tool implementation
└── bin/
    └── summit-ext            # CLI binary
```

### Extension Lifecycle

```
Discovery → Validation → Permission Check → Loading → Activation → Registration
     ↓           ↓              ↓              ↓           ↓            ↓
  (glob)    (zod schema)    (OPA policy)   (import)  (activate())  (integrations)
```

## 📦 Extension Types

| Type | Description | Use Cases |
|------|-------------|-----------|
| **connector** | Data ingestion/export | S3, APIs, databases |
| **widget** | UI visualization | Charts, dashboards, tables |
| **command** | UI/CLI commands | Actions, workflows |
| **tool** | Copilot tools | AI-powered analysis |
| **analyzer** | Data analysis | Entity scoring, pattern detection |
| **integration** | External services | Webhooks, notifications |

## 🔐 Permissions

| Permission | Description | Approval Required |
|-----------|-------------|-------------------|
| `entities:read` | Read entities | No |
| `entities:write` | Create/update entities | No |
| `relationships:read` | Read relationships | No |
| `relationships:write` | Create relationships | No |
| `investigations:read` | Read investigations | No |
| `investigations:write` | Create/update investigations | No |
| `network:access` | Network access | **Yes** ⚠️ |
| `fs:read` | File system read | No |
| `fs:write` | File system write | **Yes** ⚠️ |
| `commands:execute` | Execute shell commands | **Yes** ⚠️ |
| `api:access` | Access Summit API | No |
| `webhook:register` | Register webhooks | No |
| `user:data` | Access user data | No |

## 🛠️ CLI Commands

```bash
# List extensions
summit-ext list
summit-ext list --verbose

# Show extension details
summit-ext show <extension-name>

# Extension statistics
summit-ext stats

# Reload all extensions
summit-ext reload

# Execute extension command
summit-ext exec <extension-name>:<command> [args...] [options...]

# Install extension
summit-ext install <path-to-extension>
```

## 🎯 Features

### For Extension Developers

- **Type-Safe API**: Full TypeScript types for Extension API
- **Hot Reload**: Test changes without restart
- **Persistent Storage**: Simple key-value storage per extension
- **Logging**: Built-in logger with debug/info/warn/error
- **Configuration**: JSON config files per extension
- **Templates**: Ready-to-use templates for common patterns
- **Examples**: Complete working examples

### For Platform Administrators

- **Policy Control**: Fine-grained permission control via OPA
- **Audit Trail**: All permission checks logged
- **Version Management**: Semantic versioning support
- **Dependency Management**: Standard npm/pnpm workflow
- **Sandboxing**: Extensions run with minimum required permissions
- **Monitoring**: Extension statistics and health checks

### For End Users

- **Seamless Integration**: Extensions appear natively in UI/CLI/Copilot
- **Discoverability**: Command palette for finding extension commands
- **Consistency**: All extensions follow same UX patterns
- **Safety**: Policy-enforced security guarantees

## 📖 Examples

### Analytics Dashboard

Complete example demonstrating:
- Copilot tools (entity statistics, summaries)
- UI commands and widgets
- CLI commands
- Configuration
- Storage
- Proper lifecycle management

**Location**: `extensions/examples/analytics-dashboard/`

### Key Features Demonstrated

```typescript
// Copilot tool
export async function getEntityStats(params: { timeRange: string }) {
  // Tool implementation...
}

// UI command
export async function showChart() {
  // Command implementation...
}

// CLI command
export async function statsCommand(args, options) {
  // CLI implementation...
}

// Main activation
export async function activate(context: ExtensionContext) {
  // Setup and initialization...
  return {
    dispose: async () => {
      // Cleanup...
    }
  };
}
```

## 🔌 Integration Points

### Copilot

Extensions can expose tools and skills to the AI copilot:

```json
"copilot": {
  "tools": [{
    "name": "analyze-entity",
    "description": "Analyze an entity for suspicious patterns",
    "parameters": { ... },
    "entrypoint": "analyzeTool"
  }]
}
```

The copilot can then:
- Discover available tools
- Call tools with parameters
- Use tool results in responses

### UI Command Palette

Extensions can add commands to the UI:

```json
"ui": {
  "commands": [{
    "id": "export-report",
    "title": "Export Investigation Report",
    "icon": "📄",
    "category": "Reports",
    "entrypoint": "exportCommand"
  }]
}
```

Users can:
- Open command palette (Cmd/Ctrl+P)
- Search for extension commands
- Execute commands

### UI Widgets

Extensions can add widgets to dashboards:

```json
"ui": {
  "widgets": [{
    "id": "risk-score",
    "title": "Risk Score Widget",
    "component": "RiskScoreWidget",
    "placement": "dashboard"
  }]
}
```

### CLI

Extensions can add CLI commands:

```bash
summit-ext exec my-extension:analyze file.csv --format json
```

## 🧪 Testing

### Manual Testing

```bash
# Build your extension
pnpm build

# Load into Summit
summit-ext list

# Test copilot integration
# (Ask copilot to use your tool)

# Test UI integration
# (Open command palette, search for your command)

# Test CLI integration
summit-ext exec my-extension:my-command

# Reload after changes
pnpm build && summit-ext reload
```

### Automated Testing

```typescript
import { activate } from './index.js';
import { createMockContext } from '@summit/extensions/testing';

describe('My Extension', () => {
  it('activates successfully', async () => {
    const context = createMockContext();
    const activation = await activate(context);
    expect(activation).toBeDefined();
  });
});
```

## 🚦 Status

### ✅ Completed

- [x] Extension manifest format and validation
- [x] Extension loader with discovery
- [x] Extension registry
- [x] Policy enforcement framework
- [x] Copilot integration
- [x] UI command palette integration
- [x] CLI integration
- [x] Extension manager (high-level API)
- [x] CLI tool (`summit-ext`)
- [x] Server integration example
- [x] Basic template
- [x] Analytics dashboard example
- [x] Comprehensive documentation
- [x] Quick reference guide
- [x] Default OPA policy

### 🔄 In Progress

- [ ] Unit tests for core components
- [ ] Integration tests
- [ ] Performance benchmarks

### 📋 Roadmap

- [ ] Extension marketplace UI
- [ ] Extension signing/verification
- [ ] Extension sandboxing (containers)
- [ ] Extension resource quotas
- [ ] Extension metrics/telemetry
- [ ] Extension inter-communication
- [ ] Extension versioning/rollback
- [ ] Extension A/B testing

## 🤝 Contributing

### Developing the Framework

```bash
# Clone and install
cd /path/to/summit
pnpm install

# Build the framework
cd packages/extensions
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck
```

### Adding Examples

1. Create directory in `extensions/examples/`
2. Follow the template structure
3. Add comprehensive README
4. Test all integration points
5. Submit PR

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **GitHub Issues**: Report bugs and request features
- **Documentation**: Full docs in `docs/extensions/`
- **Examples**: Working examples in `extensions/examples/`
- **Template**: Start from `packages/extensions/templates/basic/`

## 🎓 Learning Path

1. **Read**: [Quick Reference](./quick-reference.md) (10 min)
2. **Study**: [Analytics Dashboard Example](../../extensions/examples/analytics-dashboard/) (30 min)
3. **Build**: Create extension from template (1 hour)
4. **Deep Dive**: [Building Extensions Guide](./building-extensions.md) (2 hours)
5. **Master**: Build production extension (varies)

## 📊 Metrics

### Current Stats

- **Extension Types**: 6 (connector, widget, command, tool, analyzer, integration)
- **Capabilities**: 11 distinct capabilities
- **Permissions**: 13 permission types
- **Integration Points**: 3 (Copilot, UI, CLI)
- **Templates**: 1 (basic)
- **Examples**: 1 (analytics-dashboard)
- **Documentation Pages**: 3

### Goals

- **Developer Time to First Extension**: < 1 hour
- **Extension Load Time**: < 100ms
- **Policy Check Time**: < 10ms
- **Hot Reload Time**: < 1 second

## 🔗 Related

- **Connector SDK**: `packages/sdk/connector-js/`
- **Python Connector SDK**: `modules/connector-sdk-s3csv/`
- **VS Code Extensions**: `extensions/symphony-ops/`, `extensions/vscode-maestro/`
- **CompanyOS Policy Engine**: `companyos/`

---

**Ready to build your first extension?** Start with the [Quick Reference](./quick-reference.md) or copy the [basic template](../../packages/extensions/templates/basic/)!
