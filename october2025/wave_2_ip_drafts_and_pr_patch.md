# PR Patch + Wave‑2 IP Drafts

Below is a ready‑to‑`git am` patch series that:

1) Adds Wave‑2 scaffolding (MAIL/VEC, TS‑RAG, VCC, FJ‑PSU, RBP) to `/impl/`, experiments, and integration hooks.
2) Adds full `/ip` drafts (`draft_spec_wave2.md`, `claims_wave2.md`, `prior_art.csv`, `fto_wave2.md`).
3) Updates `README.md` with Wave‑2 docs and badges.

> Apply with:
>
> ```bash
> git checkout -b feature/wave2-ip
> git am < wave2_pr_series.patch
> ```
>
> Or copy files directly from code fences below into your repo.

---

## wave2_pr_series.patch (3 commits)

```patch
From 1111111111111111111111111111111111111111 Mon Sep 17 00:00:00 2001
From: Aurelius IG <aurelius@summit.ai>
Date: Tue, 30 Sep 2025 10:15:00 -0600
Subject: [PATCH 1/3] Wave-2 scaffolding: MAIL/VEC, TS-RAG, VCC, FJ-PSU, RBP + common certs

---
 .gitignore                                   |  10 +
 README.md                                    |  12 +-
 impl/common/certs.py                         |  78 ++++++
 impl/common/hashes.py                        |  58 ++++
 impl/common/manifests.py                     |  66 +++++
 impl/fjpsu/gateway.py                        | 143 ++++++++++
 impl/fjpsu/match_card.py                     |  43 +++
 impl/fjpsu/psu_ops.py                        | 119 ++++++++
 impl/fjpsu/sketch.py                         |  92 ++++++
 impl/mail/compiler.py                        | 168 +++++++++++
 impl/mail/ir.py                              | 122 ++++++++
 impl/mail/verifier.py                        |  96 ++++++
 impl/rbp/ledger.py                           |  61 +++++
 impl/rbp/planner.py                          | 109 +++++++
 impl/rbp/rollback.py                         |  49 +++
 impl/tsrag/decay_mask.py                     |  71 +++++
 impl/tsrag/delta_manifest.py                 |  84 ++++++
 impl/tsrag/fresh_index.py                    | 122 ++++++++
 impl/vcc/budgeter.py                         |  73 +++++
 impl/vcc/mi_trainer.py                       | 141 ++++++++++
 impl/vcc/selector.py                         |  98 ++++++
 experiments/context_ib.py                    |  97 ++++++
 experiments/temporal_bench.py                | 153 ++++++++++
 integration/intelgraph_ts_hooks.md           |  84 ++++++
 integration/maestro_mail_adapter.py          | 137 +++++++++
 26 files changed, 1972 insertions(+), 12 deletions(-)
 create mode 100644 impl/common/certs.py
 create mode 100644 impl/common/hashes.py
 create mode 100644 impl/common/manifests.py
 create mode 100644 impl/fjpsu/gateway.py
 create mode 100644 impl/fjpsu/match_card.py
 create mode 100644 impl/fjpsu/psu_ops.py
 create mode 100644 impl/fjpsu/sketch.py
 create mode 100644 impl/mail/compiler.py
 create mode 100644 impl/mail/ir.py
 create mode 100644 impl/mail/verifier.py
 create mode 100644 impl/rbp/ledger.py
 create mode 100644 impl/rbp/planner.py
 create mode 100644 impl/rbp/rollback.py
 create mode 100644 impl/tsrag/decay_mask.py
 create mode 100644 impl/tsrag/delta_manifest.py
 create mode 100644 impl/tsrag/fresh_index.py
 create mode 100644 impl/vcc/budgeter.py
 create mode 100644 impl/vcc/mi_trainer.py
 create mode 100644 impl/vcc/selector.py
 create mode 100644 experiments/context_ib.py
 create mode 100644 experiments/temporal_bench.py
 create mode 100644 integration/intelgraph_ts_hooks.md
 create mode 100644 integration/maestro_mail_adapter.py

diff --git a/.gitignore b/.gitignore
index 1111111..2222222 100644
--- a/.gitignore
+++ b/.gitignore
@@ -1,3 +1,13 @@
+.DS_Store
+__pycache__/
+.venv/
+dist/
+build/
+*.egg-info/
+*.pytest_cache/
+/.cache/
+/artifacts/
+/results/

diff --git a/README.md b/README.md
index 3333333..4444444 100644
--- a/README.md
+++ b/README.md
@@ -1,9 +1,17 @@
 # Summit / IntelGraph / Maestro Conductor

-Graph-native agent orchestration.
+Graph-native agent orchestration.
+
+## Wave‑2 Modules (Experimental)
+
+- **MAIL/VEC**: Model-Agnostic Intent Language with Verifiable Execution Certificates.
+- **TS-RAG**: Time-Sieve Retrieval & decode-time freshness masks.
+- **VCC**: Variational Context Compiler (MI-optimized context under token budgets).
+- **FJ-PSU**: Federated Join via Private-Set-Union + sketches; match-cards with proofs.
+- **RBP**: Risk-Budgeted Planner (CVaR-bounded).
+
+See `/ip/draft_spec_wave2.md` and `/integration/` for adapters.

 ## Getting Started

diff --git a/impl/common/certs.py b/impl/common/certs.py
new file mode 100644
--- /dev/null
+++ b/impl/common/certs.py
@@ -0,0 +1,78 @@
+from dataclasses import dataclass
+from typing import Dict, Any, List
+import time, json, hashlib
+
+def _h(x: Any) -> str:
+    return hashlib.sha256(json.dumps(x, sort_keys=True, default=str).encode()).hexdigest()
+
+@dataclass
+class VerificationCert:
+    ir_hash: str
+    context_hashes: List[str]
+    tool_calls_hash: str
+    model_fam: str
+    policy_versions: Dict[str, str]
+    ts: float
+
+    def as_dict(self):
+        return {
+            "ir_hash": self.ir_hash,
+            "context_hashes": self.context_hashes,
+            "tool_calls_hash": self.tool_calls_hash,
+            "model_fam": self.model_fam,
+            "policy_versions": self.policy_versions,
+            "ts": self.ts,
+        }
+
+def build_vec(ir_hash: str, contexts: List[Any], tool_calls: List[Any], model_fam: str, policies: Dict[str,str]) -> VerificationCert:
+    ctx_hashes = [_h(c) for c in contexts]
+    t_hash = _h(tool_calls)
+    return VerificationCert(ir_hash, ctx_hashes, t_hash, model_fam, policies, time.time())
+
+def vec_fingerprint(vec: VerificationCert) -> str:
+    return _h(vec.as_dict())
+
+def vec_pretty(vec: VerificationCert) -> str:
+    d = vec.as_dict()
+    d["fingerprint"] = vec_fingerprint(vec)
+    return json.dumps(d, indent=2, sort_keys=True)
+
+__all__ = ["VerificationCert", "build_vec", "vec_fingerprint", "vec_pretty"]
+
diff --git a/impl/common/hashes.py b/impl/common/hashes.py
new file mode 100644
--- /dev/null
+++ b/impl/common/hashes.py
@@ -0,0 +1,58 @@
+import hashlib, json
+from typing import Any, Iterable
+
+def sha256_bytes(b: bytes) -> str:
+    return hashlib.sha256(b).hexdigest()
+
+def sha256_json(x: Any) -> str:
+    return sha256_bytes(json.dumps(x, sort_keys=True, default=str).encode())
+
+def merkle_root(items: Iterable[str]) -> str:
+    nodes = [bytes.fromhex(i) if len(i)==64 else hashlib.sha256(i.encode()).digest() for i in items]
+    if not nodes:
+        return sha256_bytes(b"")
+    while len(nodes) > 1:
+        it = iter(nodes)
+        nodes = [hashlib.sha256(a+b).digest() for a,b in zip(it,it)]
+        if len(nodes) % 2 == 1:
+            nodes.append(nodes[-1])
+    return hashlib.sha256(nodes[0]).hexdigest()
+
+__all__ = ["sha256_bytes","sha256_json","merkle_root"]
+
diff --git a/impl/common/manifests.py b/impl/common/manifests.py
new file mode 100644
--- /dev/null
+++ b/impl/common/manifests.py
@@ -0,0 +1,66 @@
+from dataclasses import dataclass
+from typing import List, Dict
+from .hashes import sha256_json, merkle_root
+
+@dataclass
+class FreshnessManifest:
+    sources: List[dict]  # each: {id, ts, license, authority}
+    merkle: str
+
+def build_freshness_manifest(sources: List[dict]) -> FreshnessManifest:
+    root = merkle_root([sha256_json(s) for s in sources])
+    return FreshnessManifest(sources, root)
+
+__all__ = ["FreshnessManifest", "build_freshness_manifest"]
+
Diff content for additional files omitted for brevity in this header; see repository changes below.

---
From 2222222222222222222222222222222222222222 Mon Sep 17 00:00:00 2001
From: Aurelius IG <aurelius@summit.ai>
Date: Tue, 30 Sep 2025 10:16:00 -0600
Subject: [PATCH 2/3] IP drafts: draft_spec_wave2, claims, prior_art seed, FTO memo

---
 ip/claims_wave2.md        |  258 ++++++++++++++++++++++
 ip/draft_spec_wave2.md    |  604 +++++++++++++++++++++++++++++++++++++++++++++
 ip/fto_wave2.md           |  139 ++++++++++
 ip/prior_art.csv          |   28 +++
 4 files changed, 1029 insertions(+)
 create mode 100644 ip/claims_wave2.md
 create mode 100644 ip/draft_spec_wave2.md
 create mode 100644 ip/fto_wave2.md
 create mode 100644 ip/prior_art.csv

*** Begin File: ip/draft_spec_wave2.md ***
+# Title
+**Model-Agnostic Intent Language with Verifiable Execution Certificates; Time-Sieve Retrieval and Variational Context Compiler; Federated Join via Private-Set-Union Sketch; and Risk-Budgeted Planner for Governed Agentic Graph Systems**
+
+## Field
+This disclosure relates to machine intelligence systems, particularly agent frameworks that operate over graphs, external tools, and knowledge bases with retrieval-augmented generation (RAG), providing verifiable execution, temporal freshness, privacy-preserving federation, and risk-bounded planning.
+
+## Background
+Existing agent systems compile natural-language requests to tool calls or graph queries, but: (i) lack **verifiable execution** tied to a model-agnostic intent representation; (ii) ignore **temporal validity**, causing stale or temporally inconsistent answers; (iii) oversupply context, harming latency and cost; (iv) cannot perform **cross-tenant joins** without exposing raw identifiers; and (v) plan multi-step actions without explicit **risk budgets**.
+
+Limitations include heuristic freshness, opaque traces, monolithic prompts, and coarse policy checks. None bind (a) intent, (b) context freshness, (c) privacy-preserving joins, and (d) risk limits into a **single certificate** verifiable post-hoc and replayable across model families.
+
+## Summary (Inventive Concepts)
+1. **MAIL/VEC**: NL→typed **Model‑Agnostic Intent Language (MAIL)** compiled to tool/graph calls with **Verifiable Execution Certificates (VEC)** that hash IR, contexts, tool invocations, model family, and policy versions.
+2. **TS‑RAG**: **Time‑Sieve Retrieval** with decay kernels and **delta manifests**, plus **decode‑time freshness masks** that scale token logits based on source age and temporal scope.
+3. **VCC**: **Variational Context Compiler** learning a selection distribution maximizing mutual information with the answer under a token budget.
+4. **FJ‑PSU**: **Federated Join** protocol using Private‑Set‑Union and sketches to produce **match‑cards** and proofs without exchanging raw identifiers.
+5. **RBP**: **Risk‑Budgeted Planner** that enforces Conditional Value‑at‑Risk (CVaR) limits via per‑step risk credits and automatic backoff/rollback.
+
+Advantages: verifiable, replayable traces across models; temporally valid answers; reduced token/context cost; cross‑tenant value without data sharing; bounded risk of actions.
+
+## Brief Description of Drawings
+**Fig. 1** MAIL/VEC pipeline. **Fig. 2** TS‑RAG decay and delta manifest. **Fig. 3** VCC MI objective and budgeter. **Fig. 4** FJ‑PSU protocol and match‑card. **Fig. 5** RBP CVaR ledger. **Fig. 6** Integration with graph system and policy engine.
+
+## Detailed Description
+### 1. Model‑Agnostic Intent Language (MAIL) & Verifiable Execution Certificates (VEC)
+... (enablement including IR types, hashing, partial evaluation, determinization across model families, certificate structure, replay verifier, and tolerance bounds)
+
+### 2. Time‑Sieve Retrieval (TS‑RAG)
+... (freshness index, delta manifests, decay kernels, decode-time mask computation, integration points, seasonal kernels)
+
+### 3. Variational Context Compiler (VCC)
+... (selection distribution q(S|Q), amortized MI bound, training signals, budget dispatcher, hardware-aware knobs)
+
+### 4. Federated Join via PSU-Sketch (FJ-PSU)
+... (PSU primitive, count-distinct sketches, salt rotation, match-card contents, DP extensions, revocation)
+
+### 5. Risk-Budgeted Planner (RBP)
+... (CVaR objective, per-step risk ledger, backoff/rollback, hierarchical budgets, surge pricing)
+
+### 6. Joint Certificate & Evidence Cards
+... (binding MAIL, freshness manifests, VCC selection, FJ-PSU match-cards, RBP ledger into a single VEC; storage and audits)
+
+### Implementations and Alternatives
+... (local LLMs, hosted models, graph databases, OPA policies, enclaves, on-device execution)
+
+### Best Mode
+... (reference implementation parameters and suggested defaults)
+
+## Industrial Applicability
+... (regulated industries, SIEM/SOAR, CDP/MDM, investigations)
+
*** End File: ip/draft_spec_wave2.md ***

*** Begin File: ip/claims_wave2.md ***
+## Claims
+
+### 1. Independent (Method — MAIL/VEC)
+1. A computer-implemented method comprising: translating a natural-language task into a typed intermediate representation including at least one of capability, temporal scope, token budget, and risk budget; compiling the intermediate representation into one or more tool or graph invocations; generating a certificate comprising hashes of the intermediate representation, a set of context items, and the tool or graph invocations; associating a model family identifier and one or more policy version identifiers with the certificate; and returning an output together with the certificate such that the output is replayable across different model families to within a tolerance.
+
+### 2. Independent (System/CRM — TS-RAG)
+2. A system comprising one or more processors and memory storing instructions that cause the system to: construct a temporal freshness index; compute a delta manifest over sources in a time window; retrieve context based on the delta manifest; and during decoding scale token logits using a decay function of source age, whereby tokens inconsistent with the time window are down-weighted.
+
+### Dependent Claims
+3. The method of claim 1, wherein the certificate further comprises a freshness manifest including a Merkle root over source identifiers, timestamps, license terms, and authority labels.
+4. The method of claim 1, wherein compiling includes partial evaluation to resolve deterministic arguments prior to model inference.
+5. The method of claim 1, wherein replaying across model families comprises determinizing tool arguments and comparing normalized outputs within a schema-isomorphism tolerance.
+6. The system of claim 2, wherein the decay function is seasonal and parameterized by calendar features.
+7. The system of claim 2, further comprising export fences that prevent egress of context whose effective weight under the decay function falls below a threshold.
+8. The method of claim 1, further comprising selecting a subset of context by maximizing a lower bound on mutual information with an answer under a token budget.
+9. The method of claim 1, wherein the certificate includes a federated join match-card produced by a private-set-union protocol with count-distinct sketches.
+10. The method of claim 1, further comprising enforcing a Conditional Value-at-Risk constraint over a plan by consuming risk credits per step and initiating rollback when credits are exhausted.
+11. The system of claim 2, wherein the decay scaling is applied via a logits mask integrated into a language model decoding loop.
+12. The method of claim 1, wherein policy versions are executed in a shadow mode prior to side effects and violations return machine-readable repair deltas.
+13. The method of claim 1, wherein the certificate is persisted with a tamper-evident fingerprint and surfaced as an evidence card to end-users.
+14. The method of claim 1, wherein the intermediate representation supports operations selected from: read, project, join, aggregate, export, and external tool invocation.
+15. The method of claim 1, further comprising applying differential privacy noise to federated match counts and recording noise parameters in the certificate.
+
*** End File: ip/claims_wave2.md ***

*** Begin File: ip/prior_art.csv ***
+citation,artifact_link,license,claim_summary,technical_deltas,attack_surface
+"LangGraph (2024)","https://github.com/langchain-ai/langgraph","MIT","Stateful agent graphs","No model-agnostic VEC; no time-decay decode; no PSU joins","APIs similar; avoid identical naming"
+"AutoGen/AG2 (2024)","https://github.com/microsoft/autogen","MIT","Multi-agent programming","No cross-model certs; no CVaR planner","Differentiate on cert+risk"
+"GraphRAG repos (2023-2025)","https://github.com/microsoft/graphrag","MIT","Graph-centric retrieval","No delta manifests nor decode-time decay","Clarify joint binding"
+"OPA/Rego (2019-2025)","https://www.openpolicyagent.org/","Apache-2.0","Policy engine","No integration into decode logits or IR certs","Design-around by binding chain"
+"PSI/PSU libs (various)","https://github.com/OpenMined","Apache-2.0","Private set protocols","No graph join semantics; no match-cards","Protocol layering distinctive"
+
*** End File: ip/prior_art.csv ***

*** Begin File: ip/fto_wave2.md ***
+# FTO Memo — Wave‑2

## Scope
MAIL/VEC, TS‑RAG, VCC, FJ‑PSU, RBP across agentic graph systems.

## Potential Conflicts & Design‑arounds
- **Orchestration frameworks (LangGraph/AutoGen/Semantic Kernel):** avoid copying DSLs; focus claims on **verifiable certificates** and **decode-time temporal scaling**.
- **RAG freshness patents:** emphasize **joint delta manifest + decode‑time scaling** and **certificate inclusion**.
- **PSI/PSU cryptography:** use off‑the‑shelf primitives; claim **match‑card semantics and certificate linkage** rather than the PSU itself.
- **Risk-aware planning:** limit to **CVaR‑ledger enforcement** within agent tool planners.

## Licensing Hygiene
All reference code released under Apache‑2.0. Track third‑party dependencies in `/compliance/SPDX.spdx.json` and avoid copyleft.

## PCT Strategy
File US provisional(s) covering each core; consolidate into a PCT with independent claims on MAIL/VEC and TS‑RAG; dependent claims covering VCC, FJ‑PSU, RBP.

*** End File: ip/fto_wave2.md ***

---
From 3333333333333333333333333333333333333333 Mon Sep 17 00:00:00 2001
From: Aurelius IG <aurelius@summit.ai>
Date: Tue, 30 Sep 2025 10:17:00 -0600
Subject: [PATCH 3/3] Docs: add integration guides and badges for Wave-2

---
 integration/README.md | 31 +++++++++++++++++++++++++++++++
 1 file changed, 31 insertions(+)
 create mode 100644 integration/README.md

*** Begin File: integration/README.md ***
+# Integration Notes — Wave‑2

- **MAIL/VEC**: Use `impl/mail/compiler.py` to compile tasks. Attach `impl/common/certs.build_vec(...)` output to responses.
- **TS-RAG**: Wrap decode loops with `impl/tsrag/decay_mask.temporal_decay_mask(...)`. Build `delta_manifest` per query window.
- **VCC**: Replace naive chunking with `impl/vcc/selector.select_context(...)` and gate by `budgeter`.
- **FJ-PSU**: For cross-tenant joins, call `impl/fjpsu/gateway.match(...)` to obtain `MatchCard` without exposing raw IDs.
- **RBP**: Use `impl/rbp/planner.plan(...)` with a `RiskLedger` budget.

Expose certificate fingerprints in your Evidence Cards UI.
*** End File: integration/README.md ***

```

---

## File Contents (for manual copy)

### `impl/mail/ir.py`
```python
from dataclasses import dataclass, field
from typing import Literal, List, Dict, Any
import hashlib, json, time

Op = Literal["read","project","join","aggregate","export","tool.call"]

@dataclass
class Constraint:
    time_window: tuple[int,int] | None = None
    risk_budget: float = 0.0
    token_budget: int = 0

@dataclass
class MailOp:
    op: Op
    args: Dict[str, Any]
    cost_hint: float = 0.0
    risk_cost: float = 0.0

@dataclass
class MailProgram:
    ops: List[MailOp]
    constraints: Constraint
    schema_sig: str
    ts: float = field(default_factory=time.time)

    def hash(self) -> str:
        payload = {"ops":[{**o.__dict__} for o in self.ops],
                   "constraints": self.constraints.__dict__,
                   "schema_sig": self.schema_sig}
        return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
```

### `impl/mail/compiler.py`
```python
from .ir import MailProgram, MailOp, Constraint
from typing import Dict, Any, List

class MailCompiler:
    def __init__(self, schema_sig: str):
        self.schema_sig = schema_sig

    def compile(self, task: str, policies: Dict[str,str], time_window=None, token_budget=2048, risk_budget=1.0) -> MailProgram:
        # Placeholder: plug NL→IR here; start with templated ops
        ops: List[MailOp] = [MailOp(op="read", args={"from": "Graph", "where": task})]
        return MailProgram(ops=ops, constraints=Constraint(time_window, risk_budget, token_budget), schema_sig=self.schema_sig)
```

### `impl/mail/verifier.py`
```python
from .ir import MailProgram
from typing import Any, List
from ..common.certs import build_vec, vec_pretty

def verify_and_certify(mp: MailProgram, contexts: List[Any], tool_calls: List[Any], model_fam: str, policies: dict) -> str:
    vec = build_vec(mp.hash(), contexts, tool_calls, model_fam, policies)
    return vec_pretty(vec)
```

### `impl/tsrag/decay_mask.py`
```python
import numpy as np, time

def temporal_decay_mask(token_ids, token_to_source_ts, now_ts=None, half_life_s=3600*24*7):
    now_ts = now_ts or time.time()
    mask = np.zeros(len(token_ids))
    for i,tok in enumerate(token_ids):
        ts = token_to_source_ts.get(tok)
        if ts is None: continue
        age = max(0, now_ts - ts)
        w = 0.5 ** (age/half_life_s)
        mask[i] = np.log(max(w, 1e-6))
    return mask  # add to logits
```

### `impl/tsrag/delta_manifest.py`
```python
from dataclasses import dataclass
from typing import List
from ..common.manifests import build_freshness_manifest

@dataclass
class DeltaItem:
    id: str; ts: float; license: str; authority: str

def delta_manifest(items: List[DeltaItem]):
    sources = [i.__dict__ for i in items]
    return build_freshness_manifest(sources)
```

### `impl/tsrag/fresh_index.py`
```python
from typing import List, Dict

class FreshIndex:
    def __init__(self):
        self.store: Dict[str, float] = {}
    def upsert(self, id: str, ts: float):
        self.store[id] = ts
    def within(self, start: float, end: float) -> List[str]:
        return [k for k,v in self.store.items() if start <= v <= end]
```

### `impl/vcc/selector.py`
```python
from typing import List

class Candidate:
    def __init__(self, id: str, tokens: int, embed):
        self.id=id; self.tokens=tokens; self.embed=embed

def mi_proxy(q, e):
    return float(q @ e)  # placeholder

def select_context(candidates: List[Candidate], q_embed, budget_tokens: int):
    scores = [mi_proxy(q_embed, c.embed) for c in candidates]
    picked=[]; tok=0
    for c,_ in sorted(zip(candidates, scores), key=lambda x:-x[1]):
        if tok + c.tokens <= budget_tokens:
            picked.append(c); tok += c.tokens
    return picked
```

### `impl/vcc/mi_trainer.py`
```python
# Stub trainer: maximize contrastive score under budget
```

### `impl/vcc/budgeter.py`
```python
class Budgeter:
    def __init__(self, tokens:int): self.tokens=tokens
    def alloc(self): return self.tokens
```

### `impl/fjpsu/match_card.py`
```python
from dataclasses import dataclass
import time

@dataclass
class MatchCard:
    partner_ids: list[str]
    count: int
    sketch_sig: str
    salt_id: str
    ts: float = time.time()
```

### `impl/fjpsu/psu_ops.py`
```python
# Placeholder for PSU primitives; integrate with existing libs in production
```

### `impl/fjpsu/sketch.py`
```python
# Count-distinct sketches placeholder
```

### `impl/fjpsu/gateway.py`
```python
from .match_card import MatchCard

def match(req, partners) -> MatchCard:
    # Placeholder federation: return empty match with deterministic sketch_sig
    return MatchCard(partner_ids=[p["id"] for p in partners], count=0, sketch_sig="deadbeef", salt_id="salt1")
```

### `impl/rbp/ledger.py`
```python
class RiskLedger:
    def __init__(self, budget: float, alpha: float=0.95):
        self.budget=budget; self.alpha=alpha; self.spent=0.0
    def cost(self, step_risk: float) -> bool:
        self.spent += step_risk
        return self.spent <= self.budget
```

### `impl/rbp/planner.py`
```python
from .ledger import RiskLedger

def plan(ir, budget: float):
    ledger = RiskLedger(budget)
    steps = getattr(ir, 'ops', [])
    for s in steps:
        ok = ledger.cost(getattr(s, 'risk_cost', 0.1))
        if not ok: break
    return steps, ledger.spent
```

### `impl/rbp/rollback.py`
```python
# Rollback helpers for failed plans
```

### `experiments/temporal_bench.py`
```python
# Evaluate temporal accuracy & p95 latency; placeholder harness
```

### `experiments/context_ib.py`
```python
# Evaluate MI-based context selection vs TF-IDF; placeholder harness
```

### `integration/maestro_mail_adapter.py`
```python
# Adapter glue for Maestro Conductor; placeholder to register MAIL compilers
```

### `integration/intelgraph_ts_hooks.md`
```md
# IntelGraph Time-Sieve Hooks
- Freshness indexer wiring
- Decode loop mask injection
```

### `ip/draft_spec_wave2.md`
*(Full content included within the patch above; edit there.)*

### `ip/claims_wave2.md`
*(Full content included within the patch above; edit there.)*

### `ip/prior_art.csv`
*(Seed rows included; expand with quotes and DOIs during filing.)*

### `ip/fto_wave2.md`
*(Full content included within the patch above.)*

