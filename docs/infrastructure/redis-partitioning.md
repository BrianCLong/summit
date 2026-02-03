# Redis Data Partitioning Strategy

Summit supports splitting Redis data across multiple instances or clusters to improve performance, isolation, and scalability. This guide explains how to configure these partitions.

## Overview

By default, the application uses a single Redis instance (`default`) for all operations (Cache, Distributed Locks, Queues, etc.).

We support **Functional Partitioning**, where different subsystems use different Redis clients.

### Available Partitions

| Partition Name | Purpose | Default Config (Fallback) |
|----------------|---------|---------------------------|
| `default` | General purpose, Session storage, Queues | `REDIS_*` |
| `cache` | Application Caching (L2) | `REDIS_*` |
| `dist` | Distributed features (Locks, Coordination) | `REDIS_*` |

## Configuration

To configure a specific partition, set the corresponding environment variables using the pattern `REDIS_{NAME}_{VAR}`.

### Example: Splitting Cache from Persistent Data

In this scenario, we use a dedicated Redis server for caching to avoid evicting persistent data (like queues) during memory pressure.

**Default Redis (Persistent/Queues):**
```env
REDIS_HOST=redis-persistent
REDIS_PORT=6379
REDIS_PASSWORD=securepass
```

**Cache Redis (Ephemeral/High-Throughput):**
```env
REDIS_CACHE_HOST=redis-cache
REDIS_CACHE_PORT=6379
REDIS_CACHE_PASSWORD=cachepass
# Optional: Use Cluster for Cache
REDIS_CACHE_USE_CLUSTER=true
REDIS_CACHE_CLUSTER_NODES=node1:6379,node2:6379
```

### Environment Variables Reference

For any partition `{NAME}` (e.g., `CACHE`, `DIST`), the following variables are available:

- `REDIS_{NAME}_HOST`: Hostname (default: `REDIS_HOST` or `redis`)
- `REDIS_{NAME}_PORT`: Port (default: `REDIS_PORT` or `6379`)
- `REDIS_{NAME}_PASSWORD`: Password (default: `REDIS_PASSWORD`)
- `REDIS_{NAME}_USE_CLUSTER`: Enable Cluster mode (`true`/`false`)
- `REDIS_{NAME}_CLUSTER_NODES`: Comma-separated list of nodes (`host:port`)
- `REDIS_{NAME}_TLS_ENABLED`: Enable TLS (`true`/`false`)

## Cluster Mode

Summit supports Redis Cluster for horizontal scaling. Set `REDIS_{NAME}_USE_CLUSTER=true` and provide the initial seed nodes in `REDIS_{NAME}_CLUSTER_NODES`.

**Example:**
```env
REDIS_CACHE_USE_CLUSTER=true
REDIS_CACHE_CLUSTER_NODES=10.0.0.1:6379,10.0.0.2:6379,10.0.0.3:6379
```
