# Release Captain GA Checklist

**Release Tag:** `[TAG]` (e.g., ga/v1.0.0)
**Date:** `[DATE]`
**Captain:** `[NAME]`

---

## 1. Pre-Release Validation

- [ ] **Board Approval**: Verify that the Governance Committee has approved the release scope. (Reference meeting notes or PR approval).
- [ ] **Feature Freeze**: Confirm no new feature code has been merged since `[CUTOFF DATE]`.
- [ ] **CI Green**: Ensure the `main` branch build is passing.
- [ ] **Security Scan**: Verify no Critical/High vulnerabilities are open in `trivy` or `snyk` reports.

## 2. Release Execution (Automation)

- [ ] **Tag Repository**: Create and push the tag (e.g., `git tag ga/v1.0.0 && git push origin ga/v1.0.0`).
- [ ] **Monitor Workflow**: Watch the `GA Release` GitHub Action.
    - [ ] Build steps passed.
    - [ ] SOC Control Tests passed.
    - [ ] Reproducibility Check passed (or warned).
    - [ ] Vulnerability Scan passed (no Criticals).
    - [ ] SBOM generation succeeded.
    - [ ] Signing succeeded.
- [ ] **Verify Artifacts**: Check the GitHub Release page for:
    - [ ] `intelgraph-platform.tar.gz`
    - [ ] `evidence-bundle.tar.gz`
    - [ ] `sbom.json`
    - [ ] Signatures (`.sig`, `.cert`, `.att`)

## 3. Evidence Review

- [ ] **Download Evidence Bundle**: Extract `evidence-bundle.tar.gz`.
- [ ] **Check SOC Results**: Read `SOC_VERIFICATION.txt` inside the bundle. It must say "pass".
- [ ] **Check Vulnerability Report**: Read `VULN_REPORT.txt`. Confirm no unapproved High/Criticals.
- [ ] **Check Reproducibility**: Read `REPRODUCIBILITY.txt`. Confirm build is deterministic (or waiver note attached).
- [ ] **Verify Signature**: Run the verification command from `EVIDENCE.md`.
    ```bash
    cosign verify-blob --certificate <cert> --signature <sig> <artifact>
    ```
- [ ] **Check SBOM**: Ensure `sbom.json` is present and valid JSON.
- [ ] **Check SOC Mapping**: Ensure `SOC_MAPPING.md` is included.

## 4. Post-Release

- [ ] **Announce**: Post to `#announcements` with link to Release Notes.
- [ ] **Deploy**: Trigger deployment to Production (if separate from Release).
- [ ] **Monitor**: Watch dashboards for 1 hour for regression signals.

---

**Sign-off:**

`[SIGNATURE/TIMESTAMP]`
