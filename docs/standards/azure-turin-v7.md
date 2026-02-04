# Azure Da/Ea/Fa v7 Compute Standard

## Scope
This standard applies to all workloads targeting Azure Da/Ea/Fa v7-series VMs ("Turin").

## Policies

### 1. Workload Mapping
- **General Purpose:** Use `Dasv7` for web servers, queues, and mixed workloads.
- **Memory Optimized:** Use `Eadsv7` for caches (Redis/Memcached), analytics, and memory-heavy agents.
- **Compute Optimized:** Use `Fadsv7` for batch processing, financial modeling, and CI runners requiring high single-thread performance.

### 2. Deterministic Performance
- For workloads requiring stable core mapping (e.g., deterministic evals, benchmarking), you **MUST** use the `Fadsv7` series which maps 1 vCPU to 1 physical core (no SMT).
- Avoid `Dasv7`/`Eadsv7` for latency-sensitive benchmarking due to SMT variability.

### 3. Local Disks
- Prefer diskless variants (e.g., `Dasv7`, `Easv7`) unless ephemeral scratch storage is strictly required.
- **Exception:** CI runners may use local NVMe variants (`Dadsv7` etc.) for build caches.

## Evidence
All selections must be backed by a Subsumption Bundle manifest in `subsumption/azure-turin-v7/manifest.yaml`.
