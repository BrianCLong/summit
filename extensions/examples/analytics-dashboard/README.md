# Analytics Dashboard Extension

Example extension demonstrating how to build extensions for Summit.

## Features

- **Entity Statistics**: Get real-time statistics about entities in your graph
- **Investigation Summaries**: Generate summaries of investigation data
- **UI Dashboard**: Visual analytics dashboard with charts
- **Copilot Integration**: Analytics tools available to the AI copilot
- **CLI Commands**: Access analytics from the command line

## Installation

```bash
# Install dependencies
pnpm install

# Build the extension
pnpm build
```

## Configuration

Create a config file at `.summit/extensions/config/analytics-dashboard.json`:

```json
{
  "refreshInterval": 60,
  "defaultTimeRange": "week"
}
```

## Usage

### Copilot

Ask the copilot:
- "Show me entity statistics for the past week"
- "Generate a summary of investigation INV-123"

### UI

1. Open the command palette (Cmd/Ctrl+P)
2. Search for "Show Analytics Dashboard"
3. The dashboard widget will appear on your dashboard

### CLI

```bash
# Get entity statistics
summit ext analytics-dashboard:stats --range week

# Get statistics for a specific type
summit ext analytics-dashboard:stats --type person --range month
```

## Development

### Project Structure

```
analytics-dashboard/
├── extension.json       # Extension manifest
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts        # Main activation function
│   ├── tools/          # Copilot tools
│   │   ├── stats.ts
│   │   └── summary.ts
│   └── commands/       # UI commands
│       └── chart.ts
└── README.md
```

### Key Files

- **extension.json**: Declares the extension's capabilities, permissions, and entrypoints
- **src/index.ts**: Main activation function called when the extension loads
- **src/tools/**: Functions exposed as copilot tools
- **src/commands/**: Functions exposed as UI commands and CLI commands

### Testing

```bash
# Build the extension
pnpm build

# Test it by loading in Summit
summit ext load ./
summit ext list
```

## Permissions

This extension requires:
- `entities:read` - Read entity data
- `relationships:read` - Read relationship data

## Learn More

See the main documentation: [Building Extensions for Summit](../../../docs/extensions/building-extensions.md)
