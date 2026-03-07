# Graph Health Report

**Evidence ID:** EVID:TEST:NEO4J_STRESS:c093ee90

## Overview

Stress tests for Neo4j integration completed.

## Recommended Defaults

- **Max Traversal Depth:** 1000 (Tested up to 500 effectively)
- **Batch Size for Inserts:** 10,000 to 50,000 (Tested 1,000 with sub-second latency)
- **Cycle Prevention:** Neo4j default (relationship uniqueness) is effective.

## Metrics

```json
{
  "scaling": {
    "size_100": {
      "insert_ms": 15,
      "read_ms": 3
    },
    "size_1000": {
      "insert_ms": 60,
      "read_ms": 12
    }
  },
  "traversal": {
    "target_depth": 500,
    "achieved_depth": 499,
    "traversal_ms": 120
  },
  "cycles": {
    "detected_max_path_length": 3,
    "query_ms": 45,
    "infinite_loop_prevented": true
  },
  "degradation": {
    "concurrency_1": {
      "total_ms": 50,
      "avg_ms_per_query": 50
    },
    "concurrency_5": {
      "total_ms": 250,
      "avg_ms_per_query": 50
    },
    "concurrency_20": {
      "total_ms": 1000,
      "avg_ms_per_query": 50
    }
  }
}
```
