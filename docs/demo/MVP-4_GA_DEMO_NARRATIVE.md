# MVP-4 GA Demo Narrative (Repo-Grounded)

## Narrative arc

MVP-4 GA is demonstrated as a governed, repeatable release path that moves from prerequisite validation to demo environment launch, data seeding, smoke validation, and final GA gate verification. Each step below references a concrete command and the file path that implements it.

## Demo flow

### 1) Validate demo prerequisites

**Command**

```bash
make demo-check
```

**Expected cues**

- Output includes `Summit Platform Demo - Prerequisite Check` and `[OK]` status lines for installed dependencies.

**Implementation evidence**

- `Makefile` target `demo-check` invokes the prerequisite checker.
- `scripts/demo-check.sh` prints the prerequisite check banner and status lines.

### 2) Start the demo environment

**Command**

```bash
make demo
```

**Expected cues**

- Output includes `Starting Summit Platform Demo Environment` and `Summit Platform Demo is Ready!`.
- Health checks report readiness for `API Server`, `Frontend`, and `Neo4j`.

**Implementation evidence**

- `Makefile` target `demo` wraps `scripts/demo-up.sh`.
- `scripts/demo-up.sh` emits the start banner and readiness output.

### 3) Seed demo data (repeatable step)

**Command**

```bash
make demo-seed
```

**Expected cues**

- Output shows `Seeding demo data...` or seed script progress logs.

**Implementation evidence**

- `Makefile` target `demo-seed` invokes `scripts/demo-seed.sh`.
- `scripts/demo-up.sh` calls the seed script during the demo boot sequence.

### 4) Run demo smoke validation

**Command**

```bash
make demo-smoke
```

**Expected cues**

- Output shows demo smoke test progress with a successful exit code.

**Implementation evidence**

- `Makefile` target `demo-smoke` invokes `scripts/demo-smoke-test.sh`.

### 5) Execute GA gate verification

**Command**

```bash
make ga
```

**Expected cues**

- GA gate script executes, creating output under `artifacts/ga`.

**Implementation evidence**

- `Makefile` target `ga` calls `scripts/ga-gate.sh` and creates `artifacts/ga`.

### 6) Optional GA verification sweep

**Command**

```bash
make ga-verify
```

**Expected cues**

- Node test runner executes `testing/ga-verification/*.ga.test.mjs`.

**Implementation evidence**

- `Makefile` target `ga-verify` runs GA verification tests and `scripts/ga/verify-ga-surface.mjs`.

### 7) Capture release evidence

**Command**

```bash
./scripts/release/collect_evidence.sh
```

**Expected cues**

- Script emits evidence collection output for the GA release bundle.

**Implementation evidence**

- `scripts/release/collect_evidence.sh` is the evidence collection script for release operations.
- Release evidence is indexed in `docs/release/GA_EVIDENCE_INDEX.md`.

## Evidence appendix

### Commands

- `make demo-check`
- `make demo`
- `make demo-seed`
- `make demo-smoke`
- `make ga`
- `make ga-verify`
- `./scripts/release/collect_evidence.sh`

### Key files

- `Makefile`
- `scripts/demo-check.sh`
- `scripts/demo-up.sh`
- `scripts/demo-seed.sh`
- `scripts/demo-smoke-test.sh`
- `scripts/ga-gate.sh`
- `testing/ga-verification/*.ga.test.mjs`
- `scripts/ga/verify-ga-surface.mjs`
- `scripts/release/collect_evidence.sh`
- `docs/release/GA_EVIDENCE_INDEX.md`

### Environment flags

- `NO_NETWORK_LISTEN=true`
- `RUN_ACCEPTANCE=false`
- `ZERO_FOOTPRINT=true`
- `CI=1`
