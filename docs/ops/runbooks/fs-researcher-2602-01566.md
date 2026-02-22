# FS-Researcher Operational Runbook

This runbook provides guidance for operating and troubleshooting the FS-Researcher feature.

## 1. Enabling the Feature
The feature is gated by the `FS_RESEARCHER_ENABLED` environment variable.
- To enable: `export FS_RESEARCHER_ENABLED=1`
- To disable: `export FS_RESEARCHER_ENABLED=0` (default)

## 2. Running Research Tasks
Use the Summit CLI:
```bash
python3 summit/cli/fs_research.py --query "Your Research Topic" --workspace ./research_output
```

## 3. Monitoring & Drift Detection
A drift detection script is available to monitor changes in research performance (e.g., number of sources found, citation density).

```bash
python3 scripts/monitoring/fs-researcher-2602-01566-drift.py --current ./research_output
```

## 4. Troubleshooting
- **Missing Artifacts**: Ensure the research task completed successfully. Check `log.md` in the workspace root for progress.
- **Permission Errors**: Verify that the workspace directory is writable.
- **Security Blocks**: If content is flagged as unsafe, it will be skipped by the Context Builder. Check `log.md` for `POTENTIAL_INJECTION` warnings.

## 5. Workspace Cleanup
Workspaces can grow large if many sources are archived. It is recommended to prune or archive older workspaces after the report has been finalized and verified.
