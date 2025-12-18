# Edge-Scale Graph Partitioning

This module implements a dynamic partitioning and sharding strategy for the IntelGraph, allowing it to scale to 10M+ nodes across distributed, potentially air-gapped environments.

## Architecture

### Components

1.  **ShardManager (`ShardManager.ts`)**:
    *   Maintains a registry of available Neo4j driver instances.
    *   Handles connection lifecycle (connect/disconnect).
    *   Supports dynamic registration of new shards at runtime.

2.  **GraphRouter (`GraphRouter.ts`)**:
    *   The primary entry point for executing Cypher queries.
    *   Intercepts queries and uses a `PartitionStrategy` to route them to the correct shard.
    *   Supports `broadcast` for cross-shard operations.

3.  **PartitionStrategy (`PartitionStrategy.ts`)**:
    *   `LocalityAwarePartitionStrategy`: Routes based on `Region` (locality) or `TenantId` (hashing).
    *   Ensures data sovereignty and optimizes latency by routing users to their nearest "edge" shard.

4.  **VectorIndexManager (`VectorIndexManager.ts`)**:
    *   Manages the creation and maintenance of Vector Indexes (`pgvector` style) on Neo4j 5.x+.
    *   Ensures consistent indexing schema across all shards.

5.  **ReplicationManager (`ReplicationManager.ts`)**:
    *   Simulates the "Air-Gapped" replication mechanism.
    *   In a production scenario, this would consume from a `ProvenanceLedger` or `Kafka` topic and replay transactions onto edge nodes.

## Usage

```typescript
import { ShardManager } from './graph/partition/ShardManager';
import { GraphRouter } from './graph/partition/GraphRouter';

// 1. Register Shards
await ShardManager.getInstance().registerShard({
    id: 'core-us-east',
    uri: 'bolt://core-db:7687',
    region: 'us-east-1'
});

await ShardManager.getInstance().registerShard({
    id: 'edge-tactical-01',
    uri: 'bolt://192.168.1.50:7687',
    region: 'tactical-edge',
    isAirGapped: true
});

// 2. Route Queries
const router = new GraphRouter();

// Automatically routes to 'us-east-1' shard if available, or hashes tenantId
const result = await router.execute(
    "MATCH (n:Person) RETURN n LIMIT 10",
    {},
    { tenantId: 'tenant-123' }
);
```

## Tradeoffs

*   **Consistency vs. Availability**: The partitioning strategy favors Availability (AP) and Partition Tolerance (P) over immediate Consistency (C). Edge nodes may lag behind Core.
*   **Complexity**: Application-side routing adds complexity to the application layer but removes the dependency on expensive Enterprise implementation details of specific DB vendors, allowing for "logical" sharding on commodity hardware.
