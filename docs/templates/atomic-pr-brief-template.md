# Atomic PR Brief Template (CVE Remediation)

## Item
- **Title:**
- **CVE / Advisory:**
- **Dependabot Alert:**
- **Fix Version / Range:**
- **Change Class:** patch | minor | major

## Vulnerability Class
- **Exploit Class:**
- **Affected Surface:**
- **Impact Summary:**

## Fix Delta
- **Manifest Change:**
- **Overrides / Pinning:**
- **Lockfile Evidence:**

## Verifier Gate
- **Gate Name:**
- **Rules (deny-by-default):**
- **Negative Fixture:**
- **Positive Fixture:**

### Suggested Verifier Skeleton
```js
#!/usr/bin/env node
// Deny-by-default verifier skeleton.
// 1) Read lockfile.
// 2) Extract package versions.
// 3) Fail if any version is below the minimum.
```

## Tests
- **Unit/Fixture Tests:**
- **CI Job:**

## Evidence Bundle
- **Item Slug:**
- **Evidence IDs:**
  - `EVD-<ITEM>-SUPPLYCHAIN-001`
  - `EVD-<ITEM>-CI-002`
  - `EVD-<ITEM>-DOCS-003`
- **Artifacts:** `index.json`, `report.json`, `metrics.json`, `stamp.json`

## Rollout / Kill Switch
- **Disable Gate:**
- **Revert Steps:**

## Verification Plan
```bash
# Add commands used for verification
```

## Stop Conditions
- **Gate failure:** stop and escalate.
- **Evidence validation failure:** stop and escalate.
