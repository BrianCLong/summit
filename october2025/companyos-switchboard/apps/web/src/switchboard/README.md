# Switchboard Engine

The Switchboard Engine is the routing and orchestration layer for CompanyOS. It handles API requests, enforces contracts, and manages communication with downstream services (Agents, NATS, etc.).

## Architecture

- **Router (`router.ts`)**: The core engine that dispatches requests to registered routes. It handles validation, retries, timeouts, logging, and metrics.
- **Registry (`registry.ts`)**: Where routes are registered.
- **Types (`types.ts`)**: TypeScript definitions for contracts.
- **API (`/api/switchboard/dispatch`)**: The HTTP entry point for clients.

## How to Add a New Route

1. **Define the Route**:
   Create a new route definition using `defineRoute`. You can do this in `registry.ts` or in a separate file imported by `registry.ts`.

   ```typescript
   import { defineRoute } from './router';
   import { z } from 'zod';

   const myNewRoute = defineRoute({
     id: 'my.new.feature',
     description: 'Description of what this route does',
     source: 'client',
     targetService: 'intelgraph', // or 'agent-gateway', etc.
     inputSchema: z.object({
       param1: z.string(),
     }),
     outputSchema: z.object({
       result: z.boolean(),
     }),
     handler: async (payload, context) => {
       // Your logic here.
       // Call downstream services, DB, etc.
       return { result: true };
     },
   });
   ```

2. **Register the Route**:
   Add it to the router in `registry.ts`.

   ```typescript
   router.register(myNewRoute);
   ```

3. **Test It**:
   Add a test case in `router.test.ts` or a new test file.

   ```typescript
   const result = await router.dispatch('my.new.feature', { param1: 'test' }, context);
   ```

## Observability

- **Logs**: Every request is logged with structured JSON. `info` on success, `error` on failure.
- **Metrics**: Latency histograms and error counters are recorded automatically.
- **Tracing**: `traceId` is propagated via `context`.

## Error Handling

- **Retries**: Routes automatically retry on failure (default 2 retries) with exponential backoff.
- **Timeouts**: Routes have a default timeout (5000ms).
- **Validation**: Input and Output schemas are enforced using Zod.
