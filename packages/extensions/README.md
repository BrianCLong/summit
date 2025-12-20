# Summit Extensions Framework

A unified extension system for Summit that enables discovery, loading, and policy-enforced execution of extensions across copilot, UI, and CLI.

## Directory Structure

```
packages/extensions/
├── src/
│   ├── index.ts                    # Main exports
│   ├── types.ts                    # Extension manifest types
│   ├── loader.ts                   # Extension discovery and loading
│   ├── registry.ts                 # Extension registry
│   ├── policy/                     # Policy enforcement
│   │   └── enforcer.ts
│   ├── integrations/               # Integration adapters
│   │   ├── copilot.ts
│   │   ├── command-palette.ts
│   │   └── cli.ts
│   └── validators/                 # Manifest validation
│       └── schema.ts
├── templates/                      # Extension templates
│   └── example/
└── package.json
```

## Features

- **Unified Manifest**: Single `extension.json` format for all extension types
- **Dynamic Discovery**: Automatic extension discovery from configured paths
- **Policy Enforcement**: Permission-based access control via OPA
- **Multi-Channel Integration**: Copilot tools, UI command palette, CLI
- **Hot Reload**: Live extension updates without restart
- **Type Safety**: Full TypeScript support

## Quick Start

See the main documentation: `docs/extensions/building-extensions.md`
