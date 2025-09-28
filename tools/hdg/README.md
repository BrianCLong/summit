# Hardware Determinism Guard (HDG)

HDG is a lightweight Python toolkit and CLI that applies deterministic
training and inference guards across CPU/GPU backends, collects
reproducibility receipts, and scans execution traces for
non-deterministic operators.

## Installation

HDG is shipped inside the repository and can be executed directly:

```bash
python -m tools.hdg --help
```

To enable the pytest plugin, add the module to your configuration:

```python
# conftest.py
pytest_plugins = ["tools.hdg.pytest_plugin"]
```

## CLI Overview

- `hdg enforce`: Apply deterministic guards, seeds, and precision limits.
- `hdg receipt`: Emit a JSON determinism receipt, optionally including an
  operator graph signature and artifact references.
- `hdg scan`: Execute a callable repeatedly, profiling PyTorch
  operations and flagging non-deterministic kernels.

Each subcommand accepts standard flags to configure precision
(`--precision fp32|bf16`), TensorFloat-32 allowance, and CuDNN behavior.

## Receipts

Receipts capture:

- Seeds across Python, NumPy, PyTorch, TensorFlow, and JAX (if available)
- Kernel configuration (CuDNN, TF32, matmul precision)
- Environment variables required for deterministic execution
- A hash of the provided operator graph description
- Optional artifact references and free-form notes

## Variance Scanner

`hdg scan` executes the target callable multiple times under a PyTorch
profiler, comparing output byte signatures and reporting non-deterministic
operators (dropout, scatter, non-deterministic CuDNN kernels, etc.).  The
command exits with a non-zero status if flagged operations are detected
or if the outputs diverge.

## Pytest Integration

The plugin enforces deterministic guards for the entire pytest session
and can emit a receipt via `--hdg-receipt`.  Disable guards with
`--hdg-disable` when necessary.
