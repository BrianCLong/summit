# GraphQL API Reference

> Generated automatically from the GraphQL server sources. Do not edit by hand.

## Module index

### mountGraphQL(app)

Mount the primary GraphQL server on the provided Express application.

The Apollo instance is configured with schema extensions that expose
authorization-aware resolvers and contextual user metadata.  The
resulting server is used both by production clients and internal
automation, so we centralise the setup here to make it visible to
TypeDoc and the generated API reference.

**Parameters**

| Name | Type | Description |
| ---- | ---- | ----------- |
| `app` | `any` | Express application that should receive the ``/graphql`` route. |

**Returns:** `Promise<void>`

## Module resolvers

### resolvers

Root GraphQL resolvers for the Summit intelligence graph.

The resolver map exposes read, write and subscription capabilities for
coherence telemetry.  Each handler participates in policy enforcement and
observability so that API consumers receive consistent governance.

#### resolvers.Mutation

##### resolvers.Mutation.publishCoherenceSignal

Publish an updated coherence signal and notify subscribed clients.

**Parameters**

| Name | Type | Description |
| ---- | ---- | ----------- |
| `_` | `any` | Unused parent resolver value. |
| `args` | `any` | GraphQL arguments containing the signal payload. |
| `ctx` | `any` | Request context with the authenticated user and pubsub bus. |

**Returns:** `Promise<boolean>` — ``true`` when the signal is accepted and emitted.

#### resolvers.Query

##### resolvers.Query.tenantCoherence

Retrieve the coherence score for a tenant with policy-aware safeguards.

**Parameters**

| Name | Type | Description |
| ---- | ---- | ----------- |
| `_` | `any` | Unused parent resolver value. |
| `args` | `any` | GraphQL arguments, including the ``tenantId`` to inspect. |
| `ctx` | `any` | Request context that supplies the authenticated user and policy purpose metadata. |

**Returns:** `Promise<any>` — Redacted tenant coherence details when the caller is allowed to access them.

#### resolvers.Subscription

##### resolvers.Subscription.coherenceEvents

###### resolvers.Subscription.coherenceEvents.subscribe

Subscribe to new coherence events and record fan-out latency metrics.

**Parameters**

| Name | Type | Description |
| ---- | ---- | ----------- |
| `_` | `any` | Unused parent resolver value. |
| `__` | `any` | Unused subscription arguments. |
| `ctx` | `any` | Request context containing the shared pubsub instance. |

**Returns:** `AsyncGenerator<any, void, unknown>`
