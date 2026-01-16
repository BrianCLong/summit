# MVP-4 GA Demo Script (Command Runbook)

> This script is intended to be run from the repo root.

## 0) Optional environment flags for constrained environments

```bash
export NO_NETWORK_LISTEN=true
export RUN_ACCEPTANCE=false
export ZERO_FOOTPRINT=true
export CI=1
```

## 1) Verify prerequisites

```bash
make demo-check
```

**Expected output cues**

- `Summit Platform Demo - Prerequisite Check`
- `[OK]` lines for Docker, Node.js, pnpm

**Implementation evidence**

- `scripts/demo-check.sh`

## 2) Launch demo environment

```bash
make demo
```

**Expected output cues**

- `Starting Summit Platform Demo Environment...`
- `Summit Platform Demo is Ready!`
- Service readiness messages for API Server, Frontend, Neo4j

**Implementation evidence**

- `scripts/demo-up.sh`

## 3) Seed demo data (repeatable)

```bash
make demo-seed
```

**Expected output cues**

- `Seeding demo data...`

**Implementation evidence**

- `scripts/demo-seed.sh`
- `scripts/demo-up.sh`

## 4) Run demo smoke tests

```bash
make demo-smoke
```

**Expected output cues**

- Smoke test completion with exit code 0

**Implementation evidence**

- `scripts/demo-smoke-test.sh`

## 5) Run GA gate

```bash
make ga
```

**Expected output cues**

- GA gate script runs and writes to `artifacts/ga`

**Implementation evidence**

- `Makefile` target `ga`
- `scripts/ga-gate.sh`

## 6) Run GA verification sweep

```bash
make ga-verify
```

**Expected output cues**

- Node test runner outputs for `testing/ga-verification/*.ga.test.mjs`

**Implementation evidence**

- `testing/ga-verification/*.ga.test.mjs`
- `scripts/ga/verify-ga-surface.mjs`

## 7) Collect release evidence

```bash
./scripts/release/collect_evidence.sh
```

**Expected output cues**

- Evidence collection steps and output artifacts

**Implementation evidence**

- `scripts/release/collect_evidence.sh`
- `docs/release/GA_EVIDENCE_INDEX.md`

## 8) Shut down demo environment

```bash
make demo-down
```

**Expected output cues**

- Demo shutdown steps complete cleanly

**Implementation evidence**

- `scripts/demo-down.sh`

## Evidence appendix

### Commands

- `make demo-check`
- `make demo`
- `make demo-seed`
- `make demo-smoke`
- `make ga`
- `make ga-verify`
- `./scripts/release/collect_evidence.sh`
- `make demo-down`

### Key files

- `Makefile`
- `scripts/demo-check.sh`
- `scripts/demo-up.sh`
- `scripts/demo-seed.sh`
- `scripts/demo-smoke-test.sh`
- `scripts/demo-down.sh`
- `scripts/ga-gate.sh`
- `testing/ga-verification/*.ga.test.mjs`
- `scripts/ga/verify-ga-surface.mjs`
- `scripts/release/collect_evidence.sh`
- `docs/release/GA_EVIDENCE_INDEX.md`
