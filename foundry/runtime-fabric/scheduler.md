# Runtime Fabric: The Heterogeneous Execution Scheduler

The Runtime Fabric is the execution layer of the Autonomous Research Foundry. It is a sophisticated, resource-aware scheduler responsible for taking abstract experimental plans from the Council of Solvers and executing them across a diverse and dynamic set of computational and physical resources.

## 1. Core Principles

*   **Execution Abstraction:** The Council of Solvers should not need to know *where* an experiment will run. They define *what* the experiment is, and the Fabric figures out the *how* and *where*.
*   **Heterogeneity by Design:** The scheduler is built from the ground up to support a wide range of backends: local CPU/GPU, containerized environments (Docker/Kubernetes), cloud HPC services, and, critically, future physical robotic laboratories via a standardized API.
*   **Resource Awareness:** The scheduler actively monitors the state, capacity, and cost of all available resources, making intelligent, real-time decisions to optimize for speed, cost, or other user-defined objectives.
*   **Scalability & Resilience:** The system is designed as a distributed, fault-tolerant service that can manage thousands of concurrent experiments.

## 2. High-Level Architecture

The Runtime Fabric consists of four primary components:

1.  **Job Queue:** A persistent, transactional queue (e.g., backed by `bullmq` or `pg-boss`) that holds `ExecutionRequest` objects submitted by the Experimentalist agent.
2.  **Dispatcher:** The central brain of the scheduler. It continuously polls the Job Queue, inspects the requirements of each `ExecutionRequest`, queries the Resource Monitor, and selects the optimal backend for execution.
3.  **Resource Monitor:** A service that maintains a real-time registry of all available execution backends and their current state (e.g., utilization, health, cost-per-hour). It exposes a queryable API for the Dispatcher.
4.  **Backend Adapters (Plugins):** A collection of standardized plugins that translate a generic `ExecutionRequest` into the specific API calls required to run a job on a particular backend. This is the key to the system's extensibility.

**Diagrammatic Flow:**

`Experimentalist Agent` → `ExecutionRequest` → `Job Queue` → `Dispatcher` → (queries `Resource Monitor`) → `Backend Adapter` → `[Local CPU | K8s | SLURM | Robotic Lab API]`

## 3. The Execution Request Specification

An `ExecutionRequest` is a standardized data structure (e.g., a Pydantic model or Protobuf message) that describes an experiment in backend-agnostic terms.

```yaml
# Example ExecutionRequest
id: "exec_req_123"
provenance_hash: "sha256:..." # Links to the Methodology node in the Knowledge Lattice
priority: 8 # 1-10 scale
requirements:
  type: "computation" # or "physical_manipulation", "synthesis", etc.
  resources:
    - type: "cpu"
      cores: 16
    - type: "gpu"
      model: "A100"
      count: 2
    - type: "memory"
      size_gb: 128
  # Constraints can be used to target specific backends
  constraints:
    - "location == 'us-east-1'"
    - "secure_enclave == true"
# The actual work to be done
payload:
  # For computation, this could be a container image and command
  container:
    image: "research/protein-folding:v1.2"
    command: ["python", "run.py", "--data", "/input/data.bin"]
    inputs:
      - source_uri: "s3://foundry-artifacts/dataset-1"
        mount_path: "/input/data.bin"
    outputs:
      - source_path: "/output/results.json"
        target_uri: "s3://foundry-artifacts/results/exec_req_123"
```

## 4. Backend Adapter Interface

Each backend (e.g., Kubernetes, a local Docker daemon, a cloud robotics API) is integrated via a plugin that adheres to a standard interface.

```python
# Conceptual Python interface for an adapter
class BackendAdapter:
    def get_name(self) -> str:
        # e.g., "kubernetes-adapter-v1"
        ...

    def can_fulfill(self, req: ExecutionRequest) -> bool:
        # Check if this backend can satisfy the request's requirements
        ...

    def submit(self, req: ExecutionRequest) -> JobStatus:
        # Translate the request and submit it to the backend's API
        ...

    def get_status(self, job_id: str) -> JobStatus:
        # Get the current status of the job
        ...

    def stream_logs(self, job_id: str) -> Iterator[str]:
        # Stream logs back to the central telemetry service
        ...

    def terminate(self, job_id: str) -> None:
        # Terminate the job
        ...
```

This plugin-based architecture allows the Foundry to easily expand its execution capabilities. Adding support for a new supercomputing cluster or a new type of robotic lab is as simple as developing a new adapter.
