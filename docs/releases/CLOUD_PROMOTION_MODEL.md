# Cloud Promotion Model

## Overview

The Summit Cloud Promotion Model implements **deterministic, auditable artifact promotion** from GA verification to dev/stage/prod cloud environments with **zero new trust assumptions**.

## Design Principles

### 1. Promotion, Not Build

Cloud deployments are **artifact movements**, not build processes:

- **No compilation** in cloud environments
- **No dependency installation** (npm, pip, etc.)
- **No test execution** in deployment pipelines
- **No runtime interpretation** or dynamic code generation

### 2. Immutable Artifact Chain

```
GA Verification → GA_READY Contract → Dev → Stage → Prod
     ↓                   ↓               ↓      ↓      ↓
  Immutable          Hash-Locked    Promoted  Promoted  Promoted
```

Every step is cryptographically verifiable and replay-safe.

### 3. Zero Trust Expansion

Cloud promotion adds **no new trust assumptions** beyond GA verification:

- Same artifacts verified in GA pipeline
- Same hashes enforced in cloud
- No new build tools or dependencies
- No credential expansion

### 4. Deterministic Provenance

Every promotion is recorded with:

- Monotonic logical index (not wall-clock time)
- Source contract hash
- Target environment
- Promotion hash (deterministic, replay-safe)
- Complete verification status

## Architecture

### Artifact Promotion Contract

Every GA-verified release gets a **GA_READY contract**:

**Location:** `artifacts/ga-proof/<sha>/GA_READY.json`

**Structure:**
```json
{
  "version": "1.0.0",
  "contract_type": "ga-ready-promotion",
  "immutable": true,
  "logical_index": 1234567890,
  "release": {
    "ga_tag": "v4.1.2",
    "commit_sha": "abc123...",
    "artifact_directory": "staging/ga-bundle"
  },
  "artifact_hashes": {
    "provenance_json": "sha256:...",
    "ga_metadata_json": "sha256:...",
    "sha256sums": "sha256:...",
    "governance_lockfile_json": "sha256:..."
  },
  "allowed_environments": ["dev", "stage", "prod"],
  "promotion_rules": {
    "no_builds": true,
    "no_mutations": true,
    "no_interpretation": true,
    "hash_verification_required": true,
    "replay_safe": true
  },
  "contract_hash": "sha256:..."
}
```

**Immutability:** Contract hash covers entire content. Any modification invalidates the contract.

### Promotion Workflows

Three environment-specific workflows enforce promotion rules:

#### 1. `deploy-dev.yml`

**Trigger:** Manual (workflow_dispatch)
**Input:** Git SHA with GA_READY contract
**Prerequisites:** Valid GA_READY contract
**Output:** Promotion record in `artifacts/promotions/dev/<sha>.json`

**Steps:**
1. Verify GA_READY contract exists and is valid
2. Verify all artifact hashes
3. Promote artifacts to dev environment (copy only)
4. Record promotion with new logical index
5. Emit promotion hash

**No builds. No tests. No mutations.**

#### 2. `deploy-stage.yml`

**Trigger:** Manual (workflow_dispatch)
**Input:** Git SHA with GA_READY contract
**Prerequisites:**
- Valid GA_READY contract
- Prior dev promotion (recommended, configurable)

**Output:** Promotion record in `artifacts/promotions/stage/<sha>.json`

**Steps:** Same as dev, with additional prerequisite checks.

#### 3. `deploy-prod.yml`

**Trigger:** Manual (workflow_dispatch)
**Input:** Git SHA with GA_READY contract
**Prerequisites:**
- Valid GA_READY contract
- Prior stage promotion (required by default)
- Environment approval (GitHub environment protection)

**Output:** Promotion record in `artifacts/promotions/prod/<sha>.json`

**Steps:** Same as dev/stage, with strictest verification and approval gates.

### Environment Lineage & Provenance

Every promotion creates an immutable provenance record:

**Location:** `artifacts/promotions/<env>/<sha>.json`

**Structure:**
```json
{
  "version": "1.0.0",
  "promotion_type": "ga-to-prod",
  "promoted_at": "2026-01-16T12:34:56Z",
  "logical_index": 1737026096,
  "promotion_hash": "sha256:...",
  "source": {
    "ga_tag": "v4.1.2",
    "commit_sha": "abc123...",
    "contract_hash": "sha256:...",
    "dev_promoted": true,
    "stage_promoted": true
  },
  "target": {
    "environment": "prod",
    "deployment_method": "artifact-promotion",
    "no_builds": true,
    "no_mutations": true,
    "environment_approval": true
  },
  "workflow": {
    "run_id": "123456789",
    "actor": "operator@example.com"
  },
  "verification": {
    "contract_verified": true,
    "hashes_verified": true,
    "promotion_rules_enforced": true,
    "stage_promotion_verified": true,
    "environment_approval_granted": true
  }
}
```

**Logical Index:** Monotonic integer ensuring total ordering of promotions. Not wall-clock time (which can be non-monotonic due to clock skew).

**Promotion Hash:** Deterministic hash of `<sha>:<env>:<logical_index>` ensuring replay-safety.

## Rollback Safety

Rollback is implemented as **forward promotion replay**, not history mutation.

### Rollback Mechanism

**Script:** `scripts/cloud/rollback-promotion.sh`

**Usage:**
```bash
./scripts/cloud/rollback-promotion.sh \
  --env prod \
  --sha <previous-ga-sha> \
  --reason "Incident #1234: API errors"
```

**Rules:**
1. Can only rollback to SHAs with valid GA_READY contracts
2. Creates new promotion record (does not delete current)
3. Uses new monotonic logical index (higher than current)
4. Records rollback provenance with reason
5. Deterministic and replay-safe

**No undo. Only forward, provable replays.**

### Rollback Provenance

Rollback creates special promotion record:

**Location:** `artifacts/promotions/<env>/<sha>.rollback.<index>.json`

**Structure:**
```json
{
  "promotion_type": "rollback",
  "rollback": {
    "from_sha": "def456...",
    "from_logical_index": 1737026000,
    "to_sha": "abc123...",
    "reason": "Incident #1234: API errors",
    "initiated_by": "sre-oncall@example.com"
  },
  ...
}
```

## Operator Guide

### Promoting a GA Release

1. **Verify GA Release Exists:**
   ```bash
   # Check GA pipeline succeeded
   gh run list --workflow=release-ga-pipeline.yml

   # Verify GA_READY contract exists
   ls artifacts/ga-proof/<sha>/GA_READY.json
   ```

2. **Promote to Dev:**
   ```bash
   gh workflow run deploy-dev.yml -f sha=<ga-sha>
   ```

3. **Verify Dev Deployment:**
   ```bash
   # Check deployment health
   # Run smoke tests
   # Monitor metrics
   ```

4. **Promote to Stage:**
   ```bash
   gh workflow run deploy-stage.yml -f sha=<ga-sha>
   ```

5. **Verify Stage Deployment:**
   ```bash
   # Run integration tests
   # Verify stage environment
   ```

6. **Promote to Prod (Requires Approval):**
   ```bash
   gh workflow run deploy-prod.yml -f sha=<ga-sha>
   ```

   GitHub will pause for environment approval.

7. **Verify Prod Deployment:**
   ```bash
   # Monitor production metrics
   # Run production smoke tests
   # Verify user traffic
   ```

### Rolling Back a Deployment

1. **Identify Rollback Target:**
   ```bash
   # Find previous GA SHA
   ls artifacts/promotions/prod/

   # Verify contract exists
   ls artifacts/ga-proof/<previous-sha>/GA_READY.json
   ```

2. **Execute Rollback:**
   ```bash
   ./scripts/cloud/rollback-promotion.sh \
     --env prod \
     --sha <previous-sha> \
     --reason "Incident #5678: Latency spike"
   ```

3. **Verify Rollback:**
   ```bash
   # Check deployment reverted
   # Verify issue resolved
   # Monitor metrics
   ```

## Auditor Guide

### Verifying a Production Deployment

An auditor can cryptographically verify a production deployment maps to a GA proof:

1. **Find Production Promotion Record:**
   ```bash
   PROD_RECORD=$(ls -t artifacts/promotions/prod/*.json | head -1)
   ```

2. **Extract SHA and Contract Hash:**
   ```bash
   SHA=$(jq -r '.source.commit_sha' $PROD_RECORD)
   CONTRACT_HASH=$(jq -r '.source.contract_hash' $PROD_RECORD)
   ```

3. **Verify Contract Exists:**
   ```bash
   CONTRACT_PATH="artifacts/ga-proof/${SHA}/GA_READY.json"
   test -f $CONTRACT_PATH || echo "ERROR: Contract missing"
   ```

4. **Verify Contract Hash:**
   ```bash
   COMPUTED_HASH=$(jq -S 'del(.contract_hash)' $CONTRACT_PATH | sha256sum | cut -d' ' -f1)
   test "$COMPUTED_HASH" = "$CONTRACT_HASH" || echo "ERROR: Contract modified"
   ```

5. **Verify Artifact Hashes:**
   ```bash
   cd $(jq -r '.release.artifact_directory' $CONTRACT_PATH)
   sha256sum -c SHA256SUMS || echo "ERROR: Artifact hash mismatch"
   ```

6. **Verify Promotion Chain:**
   ```bash
   # Verify dev → stage → prod lineage
   jq '.source.dev_promoted' artifacts/promotions/prod/${SHA}.json
   jq '.source.stage_promoted' artifacts/promotions/prod/${SHA}.json
   ```

7. **Verify No Builds Occurred:**
   ```bash
   # Check promotion record
   jq '.target.no_builds' $PROD_RECORD
   # Should be: true
   ```

### Audit Trail Properties

The audit trail provides:

- **Completeness:** Every promotion is recorded
- **Immutability:** Records cannot be modified (hash-locked)
- **Ordering:** Logical indices provide total ordering
- **Provenance:** Full chain from GA → dev → stage → prod
- **Non-repudiation:** Workflow IDs and actors recorded

## Security Model

### Threat Model

**What we defend against:**

1. **Build-time attacks in cloud:** No builds = no attack surface
2. **Dependency confusion:** No installs = no dependency resolution
3. **Supply chain injection:** Only hash-verified artifacts promoted
4. **Unauthorized promotions:** Contract verification required
5. **Replay attacks:** Monotonic indices prevent replay
6. **History mutation:** Append-only provenance records

**What we do NOT defend against:**

1. **Compromise of GA pipeline:** If GA is compromised, contract is invalid from the start
2. **Artifact storage compromise:** Assume artifact storage (S3, GCS) is trusted
3. **GitHub Actions compromise:** Assume workflow execution environment is trusted

### Trust Boundaries

1. **GA Pipeline:** Trusted. Produces GA_READY contracts.
2. **Artifact Storage:** Trusted. Stores immutable bundles.
3. **GitHub Actions:** Trusted. Executes promotion workflows.
4. **Cloud Environments:** Zero additional trust. Only receive artifacts.

### Verification Points

Every promotion workflow verifies:

1. ✓ GA_READY contract exists
2. ✓ Contract hash is valid (immutability)
3. ✓ Contract SHA matches input SHA
4. ✓ All artifact hashes match contract
5. ✓ Promotion rules are enforced (no_builds, no_mutations)
6. ✓ Prerequisites met (prior env promotions)
7. ✓ Environment approval granted (prod only)

**Fail hard on any verification failure. No exceptions.**

## Implementation Details

### Files and Scripts

**Contract Generation:**
- `scripts/release/generate-ga-ready-contract.sh` - Generate GA_READY.json after GA pipeline succeeds

**Contract Verification:**
- `scripts/cloud/verify-promotion-contract.sh` - Verify GA_READY contract before promotion

**Promotion Workflows:**
- `.github/workflows/deploy-dev.yml` - Dev promotion workflow
- `.github/workflows/deploy-stage.yml` - Stage promotion workflow
- `.github/workflows/deploy-prod.yml` - Prod promotion workflow

**Rollback:**
- `scripts/cloud/rollback-promotion.sh` - Deterministic rollback via replay

**Provenance Storage:**
- `artifacts/ga-proof/<sha>/` - GA_READY contracts
- `artifacts/promotions/dev/<sha>.json` - Dev promotion records
- `artifacts/promotions/stage/<sha>.json` - Stage promotion records
- `artifacts/promotions/prod/<sha>.json` - Prod promotion records

### Integration with GA Pipeline

The GA pipeline (`release-ga-pipeline.yml`) should invoke contract generation after successful verification:

```yaml
- name: Generate GA_READY Contract
  run: |
    ./scripts/release/generate-ga-ready-contract.sh \
      --sha ${{ github.sha }} \
      --tag ${{ needs.gate.outputs.tag }} \
      --bundle-dir staging/ga-bundle
```

This creates the contract that promotion workflows consume.

### Production Deployment Integration

Promotion workflows are **orchestration only**. Actual deployment depends on your infrastructure:

**Option 1: GitOps (ArgoCD, Flux)**
1. Promotion workflow updates deployment manifest in git
2. GitOps tool detects change and deploys
3. Workflow waits for deployment completion
4. Records promotion

**Option 2: Direct Deployment (Kubernetes, Cloud Run)**
1. Promotion workflow copies artifacts to cloud storage
2. Updates deployment spec with new image/artifact reference
3. Triggers rolling update
4. Waits for health checks
5. Records promotion

**Option 3: Immutable Infrastructure (Terraform, Pulumi)**
1. Promotion workflow updates infrastructure-as-code
2. Applies changes (new instances with new artifacts)
3. Blue-green or canary deployment
4. Records promotion

**Key Constraint:** Regardless of deployment method, **no builds occur**. Only artifact references change.

## FAQ

### Why not rebuild in cloud?

Rebuilding in cloud:
- Expands attack surface (build tools in prod)
- Introduces non-determinism (different build at different times)
- Breaks auditability (can't prove prod artifact = GA artifact)
- Adds trust assumptions (trust cloud build environment)

**Promotion model:** Build once in GA pipeline, promote immutable artifacts.

### Why use logical indices instead of timestamps?

Timestamps can be non-monotonic due to:
- Clock skew
- Daylight saving time
- NTP corrections
- Manual clock changes

Logical indices are **strictly monotonic** and provide total ordering.

### What if I need to skip an environment?

You can skip dev or stage with workflow inputs:

```bash
# Skip dev, deploy directly to stage
gh workflow run deploy-stage.yml -f sha=<sha> -f require_dev=false

# Skip stage, deploy directly to prod (not recommended)
gh workflow run deploy-prod.yml -f sha=<sha> -f require_stage=false
```

**Warning:** Skipping environments bypasses testing and increases risk.

### How do I rollback multiple environments?

Rollback each environment independently:

```bash
# Rollback prod
./scripts/cloud/rollback-promotion.sh --env prod --sha <sha> --reason "..."

# Rollback stage
./scripts/cloud/rollback-promotion.sh --env stage --sha <sha> --reason "..."
```

Each rollback creates independent provenance record.

### Can I rollback to a non-GA SHA?

**No.** Rollback requires a valid GA_READY contract. This ensures:
- Only verified artifacts are deployed
- Rollback target passed all GA gates
- Audit trail remains cryptographically verifiable

### What happens if verification fails during promotion?

Promotion workflow **fails hard**:
- No artifacts are deployed
- No promotion record is created
- Workflow exits with error
- Operator is alerted

**No partial promotions. All or nothing.**

### How do I verify a promotion was successful?

Check promotion record:

```bash
ENV=prod
SHA=abc123

RECORD="artifacts/promotions/${ENV}/${SHA}.json"

# Verify record exists
test -f $RECORD || echo "Promotion failed or incomplete"

# Check verification status
jq '.verification' $RECORD

# Verify promotion hash
EXPECTED_HASH=$(echo -n "${SHA}:${ENV}:$(jq -r '.logical_index' $RECORD)" | sha256sum | cut -d' ' -f1)
ACTUAL_HASH=$(jq -r '.promotion_hash' $RECORD)
test "$EXPECTED_HASH" = "$ACTUAL_HASH" || echo "Promotion hash mismatch"
```

## Next Steps

After implementing cloud promotion, consider:

1. **Runtime SLOs:** Define kill-switches and incident evidence capture
2. **Deployment Metrics:** Track promotion latency, success rate, rollback frequency
3. **Automated Smoke Tests:** Run post-deployment verification
4. **Canary Deployments:** Gradual rollout with automatic rollback
5. **Chaos Engineering:** Test rollback under failure conditions

---

**Version:** 1.0.0
**Last Updated:** 2026-01-16
**Maintained By:** Release Engineering Team
