# Plugin SDK & Built-ins

Context

- `vault.read(path)`: reads KV v2 (expects `kv/` mount).
- `cache.get/set(key,val,ttlSec)`: Redis-backed plugin cache.
- `logger`: basic console methods.

Built-ins

- `shodan.ip.lookup { ip }` (1h cache), `virustotal.hash.lookup { hash }` (1h cache), `crowdstrike.query { query }` (10m cache).
- Secrets from Vault KV v2:
  - `kv/data/plugins/shodan { apiKey }`
  - `kv/data/plugins/virustotal { apiKey }`
  - `kv/data/plugins/crowdstrike { clientId, clientSecret }`

Invocation

- Explicit: set `userContext.plugin = { name, inputs }` on Conductor calls.
- Heuristic: task string `plugin:<name> <arg>` (e.g., `plugin:shodan.ip.lookup 1.2.3.4`).

Verification

- `COSIGN_PUBLIC_KEY` to enable `cosign verify` for artifacts (optional in dev: `COSIGN_DISABLED=true`).

Metrics

- `plugin_invocations_total{plugin,status,tenant}` and `plugin_errors_total{plugin,tenant}`.
