# PCC-RAG Engineering Bundle (Build, CI, APIs, Security)

---

## /impl/Makefile
```
.PHONY: bootstrap test run bench lint sbom

PY := python3

bootstrap:
	uv pip install -r requirements.txt || pip install -r requirements.txt
	cargo build --release -p pq_kernel

lint:
	ruff check .
	mypy impl || true

test:
	pytest -q

run:
	$(PY) apps/demo_server.py --config experiments/configs/default.yaml

bench:
	$(PY) experiments/run_experiments.py --config experiments/configs/default.yaml --bench

sbom:
	syft . -o spdx-json > compliance/sbom.spdx
```

---

## /impl/requirements.txt
```
numpy>=1.26
scipy>=1.11
pyyaml>=6.0
uvicorn>=0.30
fastapi>=0.115
pydantic>=2.7
torch>=2.3
ruff>=0.5
mypy>=1.10
pytest>=8.3
```

---

## /impl/Cargo.toml (pq_kernel)
```
[package]
name = "pq_kernel"
version = "0.1.0"
edition = "2021"
license = "Apache-2.0"

[lib]
name = "pq_kernel"
crate-type = ["cdylib"]

[dependencies]
ndarray = "0.15"
pyo3 = { version = "0.21", features = ["extension-module"] }
```

---

## /impl/src/lib.rs (Rust PQ distance kernel)
```rust
use ndarray::{Array2, ArrayView1};
use pyo3::prelude::*;

#[pyfunction]
fn pq_distance(code: Vec<u8>, centroids: Vec<f32>, d: usize, m: usize) -> f32 {
    // code length m; centroids shape (m, 256, d/m)
    // Simplified: assume precomputed lookup table per subquantizer stored in centroids
    let mut dist = 0.0f32;
    let subd = d / m;
    for i in 0..m {
        let idx = code[i] as usize;
        let base = i * 256 * subd + idx * subd;
        for j in 0..subd {
            let c = unsafe { *centroids.get_unchecked(base + j) };
            dist += c; // placeholder for LUT lookup sum
        }
    }
    dist
}

#[pymodule]
fn pq_kernel(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(pq_distance, m)?)?;
    Ok(())
}
```

---

## /apps/demo_server.py (FastAPI demo)
```python
from fastapi import FastAPI
from pydantic import BaseModel
from impl.sketch_encoder import SketchEncoder
from impl.retriever import Retriever
from impl.coverage import CoverageAssembler

app = FastAPI(title="PCC-RAG Demo")

sketch = SketchEncoder()
retriever = Retriever(pq_index=None, sketch_map={})  # inject real index
cov = CoverageAssembler()

class Query(BaseModel):
    text: str

@app.post("/answer")
def answer(q: Query):
    ids = sketch.ids(q.text)
    # embedder omitted for brevity
    spans = []  # retriever.search(ids, q_emb, k=32)
    cc = cov.assemble(spans, tau=0.9)
    return {"answer": "TODO", "coverage_certificate": cc}
```

---

## /integration/api_contracts.md

### Summit Decoder Hook
- **Endpoint:** in-process hook `proof_context_hook(draft, cc)`
- **Inputs:**
  - `draft`: structured object with `claims: List[Claim]`
  - `cc`: Coverage Certificate JSON (see schema)
- **Outputs:**
  - `draft`: possibly modified; claims flagged/removed

### IntelGraph Services
- **POST /corpus/commit** → `{ root: string, timestamp }`
- **GET /corpus/proof?doc=...&chunk=...&span=...`** → Merkle branch
- **GET /retrieval/sketch/{id}`** → candidate chunk IDs

### Maestro Conductor Policies
- **OPA Policy Inputs:**
```
{
  "device": {"build_hash": "..."},
  "corpus": {"root": "..."},
  "cc": {"tau": 0.9, "spans": [...]},
  "risk": "default"
}
```
- **Decision:** allow/deny/flag

---

## /schemas/coverage_certificate.schema.json
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CoverageCertificate",
  "type": "object",
  "required": ["root", "spans", "policy", "sketch_ids", "timestamp"],
  "properties": {
    "root": {"type": "string", "pattern": "^[0-9a-f]{64}$"},
    "spans": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["doc", "chunk", "span", "branch"],
        "properties": {
          "doc": {"type": "string"},
          "chunk": {"type": "integer", "minimum": 0},
          "span": {
            "type": "array", "items": {"type": "integer"}, "minItems": 2, "maxItems": 2
          },
          "branch": {"type": "array", "items": {"type": "string"}}
        }
      }
    },
    "policy": {
      "type": "object",
      "properties": {"tau": {"type": "number", "minimum": 0, "maximum": 1}}
    },
    "sketch_ids": {"type": "array", "items": {"type": "integer"}},
    "timestamp": {"type": "string", "format": "date-time"}
  }
}
```

---

## /tests/test_coverage.py
```python
import json, jsonschema
from schemas.coverage_certificate_schema import schema

valid_cc = {
    "root": "f"*64,
    "spans": [{"doc":"d1","chunk":0,"span":[0,10],"branch":["a","b"]}],
    "policy": {"tau": 0.9},
    "sketch_ids": [1,2],
    "timestamp": "2025-09-30T00:00:00Z"
}

def test_schema_valid():
    jsonschema.validate(valid_cc, schema)
```

---

## /telemetry/spec.md
- **Event:** `pcc.response`
- **Fields:**
  - `latency_ms` (int)
  - `coverage` (float)
  - `uncited_claim_rate` (float)
  - `proof_bytes` (int)
  - `verify_ms` (int)
  - `sketch_ids` (list[int])
  - `corpus_root` (hex)
- **Transport:** OpenTelemetry OTLP, batch size 1–8, p95 flush <5 ms.

---

## /security/threat_model.md
- **Assets:** corpus root, span proofs, runtime attestation, user prompts.
- **Adversaries:** on-device attacker, network MITM, poisoned index maintainer.
- **Threats & Mitigations:**
  - *Tampered proofs* → verify Merkle branches client-side; signed root rotation.
  - *Model hallucination* → verifier-gated decoding + min coverage τ.
  - *Data exfiltration* → RTD with PII scrub; DP noise on updates.
  - *Replay of old corpus* → MC policy requires fresh root within SLA.

---

## /privacy/dpia.md
- **Purpose:** verifiable grounding for enterprise copilots.
- **Data Types:** user queries (transient), spans (public/synthetic), telemetry (aggregated).
- **Legal Basis:** legitimate interest/contractual necessity.
- **Safeguards:** on-device processing, DP updates, PII redaction, access controls.
- **Residual Risk:** low; periodic review every quarter.

---

## /compliance/policies.md
- **License Policy:** Apache-2.0 only; third-party inventory in SPDX.
- **Security Policy:** SLSA provenance for releases; cosign container images.
- **Data Policy:** ingestion redactors, retention ≤30 days for telemetry.

---

## /.github/workflows/ci.yml
```yaml
name: ci
on: [push, pull_request]
jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - uses: dtolnay/rust-toolchain@stable
      - name: Install deps
        run: |
          pip install -r impl/requirements.txt
      - name: Build pq kernel
        run: |
          cargo build -p pq_kernel --release
      - name: Lint
        run: |
          ruff check .
      - name: Tests
        run: |
          pytest -q
      - name: SBOM
        run: |
          syft . -o spdx-json > compliance/sbom.spdx || true
```

---

## /release/process.md
- **Tags:** `vMAJOR.MINOR.PATCH`.
- **Provenance:** SLSA Level 2 with GitHub OIDC; sign artifacts with cosign.
- **Packages:**
  - Python wheel `pccrag-*.whl`
  - Rust cdylib `pq_kernel.*.so`
  - Docker image `ghcr.io/{{ORG}}/pcc-rag:<tag>`
- **Checks:** DoD gates (latency, coverage, UCR), SBOM present, license scan clean.

---

## /integration/sdk_stubs.py
```python
class PCCSDK:
    def verify(self, cc: dict) -> bool:
        # recompute Merkle root from branches and leaf spans; compare cc['root']
        return True

    def attach(self, response: str, cc: dict) -> dict:
        return {"response": response, "cc": cc}
```

---

## /docs/api_examples.http
```
POST http://localhost:8000/answer
Content-Type: application/json

{
  "text": "What is capital adequacy ratio?"
}
```

---

## /risk_register.md
| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|----|------|------------|--------|------------|-------|
| R1 | PQ kernel perf regress | M | H | SIMD + benches | Eng |
| R2 | Verifier FN | M | M | Threshold tuning, retrain | Research |
| R3 | Proof bloat | L | M | Branch dedup, KZG option | Arch |
| R4 | Policy drift | M | M | MC compliance tests | PM |

---

## /docs/README.md
- Quickstart: `make bootstrap && make run`.
- Verify CC schema: `pytest tests/test_coverage.py`.
- See `/integration/api_contracts.md` for Summit/IntelGraph/MC hooks.
- Patent materials in `/ip/` and figures in `/figures/`.

---

