# ⚙️ Admin & Operations Configuration Guide

This guide details critical configuration settings for production environments. These settings should be tuned based on load and infrastructure capacity.

## 🎛 Critical Production Settings

### 1. Database Connection Pool (`PG_WRITE_POOL_SIZE`)

Controls the maximum number of concurrent connections to the primary PostgreSQL database.

- **Environment Variable:** `PG_WRITE_POOL_SIZE`
- **Default:** `24`
- **Recommended Production Value:** `40-80` (depending on CPU cores)
- **Impact:**
  - **Too Low:** Requests queue up, leading to high latency or timeouts under load.
  - **Too High:** Excessive context switching and memory usage on the database server, potentially degrading performance.

**How to Change:**
Update `.env` or your deployment manifest (Kubernetes/ECS):

```bash
# Increase for high-throughput write workloads
PG_WRITE_POOL_SIZE=60
```

> **Note:** The read pool is configured separately via `PG_READ_POOL_SIZE` (default: `60`).

### 2. Log Level (`LOG_LEVEL`)

Controls the verbosity of application logs.

- **Environment Variable:** `LOG_LEVEL`
- **Default:** `info`
- **Values:** `fatal`, `error`, `warn`, `info`, `debug`, `trace`
- **Impact:**
  - **`debug`/`trace`:** Extremely verbose. Can fill disk space rapidly and impact performance. Use only for temporary debugging.
  - **`info`:** Standard production level. Logs startup, requests, and significant events.
  - **`error`:** Minimal logs. Only failures are recorded.

**How to Change:**

```bash
# Enable verbose logging for debugging
LOG_LEVEL=debug
```

### 3. Feature Flags

Features can be toggled via environment variables without code changes.

- **Format:** `FEATURE_<NAME>=true|false`
- **Example:** `FEATURE_NARRATIVE_SIMULATION=true`

See `server/src/config/mvp1-features.ts` for a full list of available flags.

### 4. RLVR PEFT Policy Guardrails

Enable RLVR-aware PEFT defaults when running reinforcement-learning-from-verifier (RLVR) tuning jobs.

- **Environment Variables:**
  - `RLVR_ENABLED` (default: `false`)
  - `RLVR_PEFT_ADAPTER` (options: `lora`, `dora`, `adalora`, `miss`; default: `dora` when RLVR is enabled)
  - `RLVR_PEFT_RANK` (default: `32`; enforced minimum: `8` unless overridden)
  - `RLVR_PEFT_ALLOW_UNSAFE` (default: `false`; required to bypass guardrails for SVD-init or rank<8)
  - `RLVR_PEFT_WARN_ONLY` (default: `false`; converts hard errors to warnings for experimentation)

**Guardrails:**

- Blocks SVD-initialized adapters (`pissa`, `milora`, `svd_init_*`) under RLVR unless `RLVR_PEFT_ALLOW_UNSAFE=true`.
- Blocks ranks below `8` under RLVR unless explicitly overridden.
- Warns (override required) for extreme parameter reductions such as `vera`, `rank1`, `ln_tune_only`, or `ia3_only`.
- Prefers structural adapters (DoRA/AdaLoRA/MiSS) over vanilla LoRA for RLVR workloads.

**Why:** Based on arXiv:2512.23165, structural PEFT variants outperform vanilla LoRA for RLVR, SVD-initialized adapters can
collapse, and aggressive parameter reduction bottlenecks reasoning.

---

## 🔒 Security Configuration

- **`JWT_SECRET`**: Must be a 32+ character random string.
- **`CORS_ORIGIN`**: Comma-separated list of allowed origins. **Must not** be `*` in production.
- **`RATE_LIMIT_MAX_REQUESTS`**: Adjust based on expected traffic per user (default: `100` per minute).
