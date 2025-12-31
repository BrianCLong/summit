# Plugin Developer Guide

## Getting Started

1.  **Scaffold**: Create a new directory and `plugin.json`.
2.  **Implement**: Write your `Plugin` class.
3.  **Pack**: Bundle your code.
4.  **Test**: Upload and run in a dev tenant.

## Example: Hello World

**plugin.json**
```json
{
  "id": "com.example.hello",
  "name": "Hello World",
  "version": "1.0.0",
  "entryPoint": "index.js",
  "capabilities": []
}
```

**index.js**
```javascript
module.exports = {
  async initialize(context) {
    context.log.info("Hello plugin initialized!");
  },

  async execute(action, params, context) {
    if (action === "greet") {
      return { message: `Hello, ${params.name || "World"}!` };
    }
    throw new Error(`Unknown action: ${action}`);
  }
};
```

## Best Practices

*   **Statelessness**: Do not store state in global variables. Use the provided storage API or external databases.
*   **Error Handling**: Catch and handle errors gracefully. Return meaningful error messages.
*   **Async/Await**: Use async/await for all I/O operations.
*   **Logging**: Use `context.log` instead of `console.log`.

## Testing

Use the `summit-plugin-test` harness (TBD) to run unit tests against your plugin logic before packaging.
