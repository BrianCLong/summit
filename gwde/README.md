# GW-DE Dual-Entropy Watermark Suite

This package provides a reference implementation of the "GW-DE" dual-entropy watermarking
scheme described in Council Wishbook Vol. III. The core encoder/decoder logic is
implemented in C++ and exposed to Python through pybind11 bindings. A feature-complete
fallback implementation is also included to simplify testing when native builds are
unavailable.

## Layout

```
include/gwde/     # Public C++ headers
src/              # Core C++ implementation
bindings/         # pybind11 bindings for the Python module
python/gwde/      # Python package with bindings + laundering helpers
```

## Building the native module

```bash
cmake -S gwde -B build -DPython_EXECUTABLE=$(which python3)
cmake --build build
```

If `pybind11` is not available, the Python package falls back to the pure-Python
implementation automatically.

## Python package usage

```python
import numpy as np
import gwde

result = gwde.embed("watermark me", key="secret", state_seed=42)
score = gwde.detect(result["watermarked"]).score
```

See `tests/test_gwde.py` for laundering regression coverage and the `gwde.roc`
module for ROC/AUC utilities.

