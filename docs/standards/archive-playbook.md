# Archive Playbook: Historical Version Strategy

This playbook formalizes the strategy for the `.archive/` directory and any other designated archive locations within the repository. The core mission of the archive is to **preserve what happened and why, without preserving operational power** (as outlined in `SUMMIT_ARCHIVE_SPEC.md`).

## 1. Qualification: What Belongs in the Archive?
The archive is the final resting place for materials that are no longer actively used but hold historical, contextual, or compliance value.
- **Deprecated Code:** Features, modules, or services that have been officially sunset or replaced.
- **Old Documentation:** Outdated ADRs, legacy design documents, and obsolete playbooks.
- **Obsolete Workflows:** GitHub Actions workflows, CI/CD scripts, or deployment manifests that are no longer part of the active pipeline.
- **Historical Assets:** Assets from past major milestones (e.g., GA Program v1) that serve as reference material.

## 2. Preservation: Preserving Essential Metadata
When moving material to an archive location, the historical context must be explicitly recorded.
- **Manifest Requirement:** Every newly archived component (or batch of components) MUST include an `ARCHIVE_MANIFEST.md` (or `README.md`) at its root.
- **Metadata Details:** The manifest must detail:
  - **What it is:** A brief description of the component.
  - **Date of Archival:** When the component was archived (ISO8601 format).
  - **Reason for Archival:** Why the component was decommissioned (e.g., "Replaced by v2 architecture", "Deprecated in Sprint 25").
  - **Original Location:** Where the files originally resided before archiving.
- **Sanitization:** Ensure operational secrets, active signing keys, and live infrastructure configs are stripped before archiving.

## 3. Restoration: Retrieving Historical Context
The archive is strictly **static**. The goal is study, not resurrection.
- **View-Only Access:** Historical code and documents should be referenced in-place for context, compliance, or architecture tracing.
- **No Direct Resurrection:** Do not move archived files back into the active codebase.
- **Logic Porting:** If historical logic is needed, developers must manually review the archived code and adapt the logic to current architectural standards in the active codebase.

## 4. Prevention: Keeping Archived Material Inactive
To ensure archived material stays out of active workflows and cannot be accidentally executed:
- **No Active Imports:** Active codebase files (`.ts`, `.js`, `.py`, etc.) MUST NOT import or reference code residing inside any `.archive/` directory.
- **No Executable Permissions:** All shell scripts and executable binaries within `.archive/` must have their executable bit removed (`chmod -x`).
- **CI/CD Invalidation:** Archived CI/CD workflows (e.g., `.github/workflows/.archive/*.yml`) must be kept in subdirectories that prevent automated runners from discovering and triggering them.

This strategy ensures that our repository maintains a pristine active state while safely preserving the valuable evolutionary history of the Summit platform.
