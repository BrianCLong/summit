# Audit Replay Instructions

**Role:** External Auditor
**Objective:** Independently verify the determinism and integrity of the Summit supply chain.

## Prerequisites
- Docker (or compatible container runtime)
- Node.js 20+
- Git

## 1. Clone & Baseline
Obtain the source code trusted state.

```bash
git clone https://github.com/BrianCLong/summit.git
cd summit
# Verify HEAD hash matches the release manifest
git rev-parse HEAD
```

## 2. Verify Determinism Policy
Execute the determinism enforcer against critical artifacts.

```bash
# Install dependencies (if needed, or verify with zero-dep script)
# The verify_determinism.mjs script is standalone nodejs
node scripts/ci/verify_determinism.mjs
```

**Expected Output:**
> ✅ ... is deterministic.
> Integrity Verified: All artifacts conform to determinism policy.

## 3. Verify SLSA Provenance
Validate the schema compliance of the provenance artifact.

```bash
# (Optional) Use a JSON schema validator
npx ajv-cli validate -s docs/ga/slsa_provenance.schema.json -d docs/ga/slsa_provenance.example.json
```

**Expected Output:**
> docs/ga/slsa_provenance.example.json valid

## 4. Replay Build (Simulation)
To verify that the build output is reproducible:

```bash
# 1. Clean environment
git clean -fdx

# 2. Run the build (deterministic mode)
npm install
npm run build

# 3. Check for specific artifact hashes (simulated here for guide)
# shasum -a 256 dist/server.js
```

*(Note: Full binary reproducibility requires the specific build-container context defined in `ci-trusted.yml`)*

## 5. Trust Boundary Inspection
Verify that trusted workflows are isolated.

```bash
# Ensure no workflows trigger on untrusted input with write permissions
grep -r "pull_request_target" .github/workflows/
```
**Expected Result:** Empty, or strictly scoped to label-checking only.

---
**End of Audit Procedure**
