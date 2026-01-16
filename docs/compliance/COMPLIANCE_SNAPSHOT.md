# Compliance Snapshot Guide

## Overview

A Compliance Snapshot is a read-only, static representation of the compliance posture for a specific release or commit. It is generated automatically from the Evidence Bundle and is intended for auditors, board members, and external reviewers.

## Structure

The snapshot is located in `artifacts/compliance-snapshot/<SHA>/` and contains:

*   **index.md**: Entry point and overview.
*   **controls.md**: A matrix showing the status of each control (Pass/Fail) and links to evidence.
*   **evidence_inventory.md**: A complete list of all files in the evidence bundle with their checksums.
*   **risk_register.md**: A summary of known risks and exceptions.

## How to Review

1.  **Open `index.md`** in a Markdown viewer or browser.
2.  **Navigate to `controls.md`** to see the compliance coverage.
3.  **Verify Evidence**: Use the `evidence_inventory.md` to cross-reference files provided in the `release-bundles/<SHA>/evidence/` directory.

## Generation

Snapshots are generated via the `scripts/compliance/generate_compliance_snapshot.ts` script, which consumes a verified Evidence Bundle.

```bash
npx tsx scripts/compliance/generate_compliance_snapshot.ts
```

## Integrity

The snapshot is derived from the immutable Evidence Bundle. Any modification to the bundle invalidates the snapshot.
