# GA Declaration Checklist

Release Captain: **[name]**
GA Tag: **[vX.Y.Z]**
Commit SHA: **[sha]**
Date: **[yyyy-mm-dd]**

---

## 1. Prerequisites

- [ ] All **always_required** workflows from `docs/ci/REQUIRED_CHECKS_POLICY.yml` are green for the GA tag.
- [ ] All applicable **conditional_required** workflows (based on changed paths) are green.
- [ ] Branch protection on `main` enforces these required checks.

## 2. Quality Gates

- [ ] Unit tests & coverage meet target thresholds.
- [ ] No open P1 security issues.
- [ ] No open `priority:ga` issues without explicit deferral.

## 3. Documentation

- [ ] README updated and accurate.
- [ ] ARCHITECTURE.md finalized for this release.
- [ ] SECURITY.md and OPERATOR_GUIDE.md updated.
- [ ] Migration or upgrade guide written if needed.
- [ ] Any new features documented in user‑facing docs.

## 4. Compliance & Evidence

- [ ] SOC Control Verification job green on GA tag.
- [ ] SOC evidence bundle generated (`SOC2_EVIDENCE_BUNDLE.md` or equivalent).
- [ ] Release evidence bundle generated for this GA tag.
- [ ] Security evidence (SBOM, vulnerability scans, CodeQL) captured.

## 5. Sign‑off

- [ ] Engineering Lead: **[name]** — Date: **[ ]**
- [ ] Product Lead: **[name]** — Date: **[ ]**
- [ ] Security Lead: **[name]** — Date: **[ ]**
- [ ] Compliance / Audit: **[name]** — Date: **[ ]**
