# REST API Data Source Plugin

This example plugin demonstrates how to create a data source connector that integrates with any REST API.

## Features

- Connect to any REST API
- Support for authentication via API keys
- Configurable timeout and pagination
- Automatic error handling
- Health check support

## Configuration

```json
{
  "baseUrl": "https://api.example.com",
  "apiKey": "your-api-key",
  "timeout": 30000
}
```

## Usage

1. Install the plugin
2. Configure with your API details
3. Use the data source in your investigations

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT
