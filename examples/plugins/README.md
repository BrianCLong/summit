# Summit Plugin Examples

This directory contains example plugins demonstrating various plugin types and capabilities.

## Available Examples

### 1. REST API Data Source (`example-data-source/`)

Demonstrates how to create a data source connector for REST APIs.

**Key Features:**
- API authentication
- Pagination support
- Error handling
- Configuration schema

### 2. Sentiment Analyzer (`example-analyzer/`)

Shows how to build a custom analyzer plugin.

**Key Features:**
- Text analysis
- Confidence scoring
- Entity extraction
- Insight generation

### 3. Network Visualization (`example-visualization/`)

Example of a custom visualization widget.

**Key Features:**
- Custom React component
- Data transformation
- Interactive controls
- Layout options

### 4. Slack Integration (`example-workflow/`)

Workflow action plugin that integrates with Slack.

**Key Features:**
- Webhook handling
- API endpoints
- Event subscriptions
- Error recovery

## Getting Started

Each example includes:

- `src/` - Plugin source code
- `test/` - Unit tests
- `plugin.json` - Plugin manifest
- `README.md` - Specific documentation
- `package.json` - Dependencies

To try an example:

```bash
cd example-data-source
npm install
npm run build
npm test
```

## Learning Path

1. Start with `example-data-source` to understand basic plugin structure
2. Move to `example-analyzer` for more complex logic
3. Try `example-visualization` for UI extensions
4. Finish with `example-workflow` for advanced integrations

## Creating Your Own Plugin

Use the CLI to scaffold a new plugin:

```bash
summit-plugin create my-plugin
```

Then refer to these examples for patterns and best practices.

## Documentation

- [SDK Documentation](../../docs/plugins/SDK.md)
- [Developer Guide](../../docs/plugins/DEVELOPER_GUIDE.md)
- [API Reference](../../docs/plugins/API.md)

## Support

- GitHub Issues: https://github.com/summit/plugins/issues
- Discord: https://discord.gg/summit
- Forum: https://forum.summit.dev
