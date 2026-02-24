# Model Sandbox Runner

The Model Sandbox Runner is a secure tool for executing local or self-hosted AI models in a hardened environment.

## Usage

```bash
./run.sh <image> <weights_path> [args...]
```

### Example

```bash
./run.sh alpine:latest ./fixtures/dummy-weights.bin echo "Hello from sandbox"
```

## Security Features

- **Non-root Execution:** Runs as UID/GID 1001:1001.
- **Read-only RootFS:** Prevents modifications to the container environment.
- **Egress Blocking:** Network access is disabled by default (`--network none`).
- **Seccomp Profiling:** Restricted system calls via a custom profile.
- **Resource Limits:** Default limits on memory (8GB) and CPU (4 cores).
- **Weight Verification:** Ensures model weights match the allowlisted digest.

## Artifacts

Every run produces the following in the `runtime/` directory:
- `receipts/<runId>.run.json`: Deterministic record of the run.
- `receipts/<runId>.stamp.json`: Temporal metadata (timestamps, user).
- `logs/<runId>.stdout.log`: Captured standard output.
- `logs/<runId>.stderr.log`: Captured error output.

## Policy Configuration

Policies are defined in `.github/policies/model-sandbox/`:
- `model-allowlist.yml`: Allowed models and their SHA256 digests.
- `egress-allowlist.yml`: Permitted outbound connections (if enabled).
- `security-profile.json`: The seccomp profile used by the runner.
