# Module Integrity Gate

The module integrity gate prevents common import-related failures in the IntelGraph platform by validating that all import/export paths resolve to actual files on disk.

## What It Checks

- **Missing imported files**: Import paths that reference files that don't exist
- **Case sensitivity issues**: Import paths with incorrect case for the actual file on disk
- **Barrel export issues**: Missing index files or incorrect export paths

## Baseline Mode Operation

This gate runs in **baseline mode**, meaning:

- ✅ It tolerates the existing 8,105+ violations (already catalogued)
- ✅ It only blocks CI on NEW violations introduced by changes
- ✅ It prevents the import integrity debt from growing

## How to Run Locally

```bash
node scripts/ci/verify_module_integrity.mjs
```

## How to Interpret Results

The script generates a report at `docs/ops/integrity/module-integrity-report.json` with details about:

### New Violations (CI Blocking)

If the script finds NEW violations (compared to baseline), CI will fail with output like:

```
❌ Found 5 NEW integrity violations (FAILURE - blocking CI):
  • missing: client/src/features/export/index.ts -> "./ExportCaseDialog.js"
  • case_mismatch: client/src/components/common/UserProfile.jsx -> "./userProfile.jsx"
```

### Existing Violations

Current total violations are logged but don't block CI:

```
📊 Current total: 8105 violations (8105 existing, 0 new)
```

## Making Changes Safely

### To Add New Imports

- All new import paths must resolve to actual files
- Match exact file casing
- Ensure barrel exports are properly configured

### To Fix Existing Violations

Address any violations from the stratified list in `docs/ops/integrity/module-integrity-summary.md` following the priority order.

## Integration

The module integrity check runs in CI as a required gate before merging Pull Requests. It operates as a ratchet - preventing new import-related failures while enabling systematic remediation of existing debt.
