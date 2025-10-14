# Integration Lane Conventions

- **No network egress.** A test-only guard blocks HTTP/HTTPS/TCP to non-loopback hosts.
- **No `.only`** in specs. Using `describe.only`/`it.only` throws to keep coverage honest.
- **In-process only.** Use local harnesses and mocks under `tests/integration/__mocks__/**`.
- **Serial**: `maxWorkers: 1` to avoid race conditions and lower flake risk.