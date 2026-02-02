# Repo Assumptions & Reality Check

## 1.3 Repo Reality Check (Verified vs ASSUMPTION)

### Verified (public repo surface)

* **Repo exists**: Top-level directories include `api/`, `apis/`, `api-schemas/`, `apps/`, `bindings/`, `alerting/`, `RUNBOOKS/`, `SECURITY/`.
* **Governance**: `docs/ci/REQUIRED_CHECKS_POLICY.yml` exists and defines the "CI Core (Primary Gate)" and other required checks.
* **Runtime (`api/`)**:
  * **Language**: Python 3.9 (Verified via `api/Dockerfile`).
  * **Framework**: FastAPI (Verified via `api/main.py`).
  * **Auth**: Single stubbed API Key (`verify_api_key` in `api/main.py`). **Migration Required**.
  * **Tenancy**: No multi-tenancy context found in `api/main.py`. **Build Required**.
  * **Database**: Neo4j and Redis drivers present.
  * **Observability**: OpenTelemetry configured.
* **Bindings**: `bindings/ibrs-node` is a Node.js binding backed by Rust (`@napi-rs/cli`).

### ASSUMPTIONS (must validate before executing PRs)

* **New Services**: Will use Python/FastAPI to match `api/` spine.
* **Queue**: `maestro` package likely handles orchestration, but specific queue technology (Celery vs Redis Queues) for Platform Spine needs definition.
* **OpenAPI**: `api/openapi.yaml` exists; assumed to be source-of-truth or generated.

### Validation Checklist

* [x] Verify `api/` runtime (Python 3.9 / FastAPI).
* [x] Verify Auth pattern (Stub API Key).
* [x] Verify Tenancy (None).
* [x] Verify Governance Policy (`docs/ci/REQUIRED_CHECKS_POLICY.yml`).
* [ ] Verify `maestro` queue mechanism.

### Must-not-touch (until validated)

* `docs/ci/REQUIRED_CHECKS_POLICY.yml` (Governance-controlled).
* `.github/workflows/*` (Avoid CI breakage).
* `SECURITY/*` baselines (Extend only, don't rewrite).
