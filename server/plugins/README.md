# Summit Server Plugin System

The Summit server now supports loading custom data integrations implemented as sandboxed plugins. Plugins run in a locked-down Node.js VM, so they can call external APIs or databases without compromising the host application.

## Directory Layout

```
server/
  plugins/
    README.md            # This guide
    samples/
      rest-api/          # Sample integration
        plugin.json
        index.js
```

You can add additional plugins by creating sub-directories anywhere beneath `server/plugins/` that contain a `plugin.json` manifest and a script file.

## Plugin Manifest (`plugin.json`)

Each plugin must provide a manifest that declares metadata and runtime constraints.

| Field | Required | Description |
| --- | --- | --- |
| `name` | ✅ | Globally-unique plugin identifier. Used for registration and execution. |
| `version` | ✅ | Plugin version string. |
| `description` | | Human-readable description shown in tooling. |
| `entry` | ✅ | Relative path to the JavaScript entry point within the plugin directory. |
| `timeoutMs` | | Optional execution timeout override (defaults to 5000 ms). |
| `allowedEnv` | | List of environment variable names that should be exposed to the sandbox. |
| `allowedModules` | | Extra Node modules the plugin is allowed to `require`. Relative imports within the plugin folder are always permitted. |
| `allowedVaultPaths` | | Whitelist of Vault KV path prefixes the plugin may access via the runtime API. |
| `cacheKeyPrefix` | | Namespace prefix applied to cache reads/writes initiated by the plugin. |

## Plugin Module (`index.js`)

The entry script is executed inside a `vm` sandbox. It must export an object with an `execute` function:

```js
module.exports = {
  metadata: {
    name: 'my-plugin',
    version: '1.0.0',
  },
  async execute({ inputs, context, config }) {
    // inputs: payload provided by Summit when invoking the plugin
    // context: sandbox runtime helpers (logger, fetch, env, cache, vault)
    // config: optional host-provided configuration
  },
};
```

### Runtime Context

The `context` argument exposes the following helpers:

- `context.logger` – namespaced logger with `info`, `warn`, `error`, and `debug`.
- `context.fetch` – standard `fetch` implementation for HTTP calls.
- `context.env` – object containing whitelisted environment variables.
- `context.cache` – (optional) wrapper around the Summit cache with namespaced `get`/`set` helpers.
- `context.vault` – (optional) Vault accessor restricted to the prefixes declared in `allowedVaultPaths`.
- `context.manifest` – the parsed manifest for the currently executing plugin.

Plugins may also use timers (`setTimeout`, `setInterval`), `URL`, `URLSearchParams`, and `Buffer`. Requiring core or third-party modules must be explicitly enabled via `allowedModules`.

## Loading Plugins

Invoke the new `registerCustomPlugins` helper during server bootstrap to load available manifests and register them with the existing plugin registry:

```ts
import { registerCustomPlugins, registerBuiltins } from './plugins';

await registerBuiltins();
await registerCustomPlugins();
```

You can pass a custom directory or timeout override:

```ts
await registerCustomPlugins({ directory: '/opt/summit/plugins', timeoutMs: 10_000 });
```

Once registered, plugins can be executed through the existing `runPlugin` utility:

```ts
const result = await runPlugin('rest-api-sample', { resource: 'posts', id: 1 }, { tenant: 'alpha' });
```

## Sample: REST API Integration

The `rest-api-sample` plugin demonstrates a simple HTTP integration. It accepts an input payload that specifies a REST resource and optional identifier, then fetches the resource using `fetch`.

Key behaviors:

- Uses `context.env.SAMPLE_REST_API_URL` as an override for the base URL.
- Automatically adds a bearer token header if `SAMPLE_REST_API_TOKEN` is exposed through `allowedEnv`.
- Caches the last HTTP status code for observability.
- Returns the response payload, HTTP status, and request URL to the caller.

Use the manifest and script as a blueprint when building new integrations.
