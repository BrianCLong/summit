# Health Score Engine

## Overview

The health score is a 0-100 integer indicating the overall stability of the cluster.

## States

* **HEALTHY** (85-100): Optimal operation.
* **DEGRADED** (60-84): Issues present but functioning.
* **CRITICAL** (0-59): Immediate attention required.

## Drivers

Drivers are structured tokens explaining score penalties:

* `node_not_ready`: `ready_nodes < total_nodes` (-25)
* `cpu_high`: `cpu_util_pct > 90` (-15)
* `mem_high`: `mem_util_pct > 90` (-15)

## Determinism

The scoring logic is purely functional and deterministic based on the `ClusterSnapshot`.
