# Examples

The `examples/` directory provides runnable demonstrations that showcase how to compose the Liquid Nano runtime with common edge patterns.

## HTTP Bridge Demo

- **File:** `edge/http-bridge-demo.mjs`
- **What it does:** Launches the runtime, registers persistence callbacks, and exposes an HTTP endpoint for sensor ingestion.
- **Run it:**
  ```bash
  npm run --workspace @summit/liquid-nano build
  node packages/liquid-nano/examples/edge/http-bridge-demo.mjs
  ```
- **Test it:**
  ```bash
  curl -X POST http://localhost:8080 \
    -H 'Content-Type: application/json' \
    -d '{"reading":24.5,"unit":"C"}'
  ```

## Integration Walkthroughs

Additional integration scenarios (MQTT, gRPC, filesystem tailing) can be modeled after the HTTP bridge by adapting `startHttpBridge`.
