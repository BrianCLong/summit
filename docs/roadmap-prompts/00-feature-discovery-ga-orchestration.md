# Prompt #00: Feature Discovery -> GA Orchestration (Governance Meta Prompt)

**Target**: GA Readiness (Pre-implementation gate)
**Owner**: Product/Architecture/Governance
**Depends on**: docs/SUMMIT_READINESS_ASSERTION.md, docs/governance/CONSTITUTION.md, docs/roadmap/STATUS.json

---

## Pre-Flight Checklist

Before running this prompt, verify:

```bash
# ✅ Readiness baseline exists
ls -la docs/SUMMIT_READINESS_ASSERTION.md

# ✅ Governance authority files exist
ls -la docs/governance/CONSTITUTION.md docs/governance/META_GOVERNANCE.md

# ✅ Roadmap status file exists and is valid JSON
node -e "const fs=require('fs');JSON.parse(fs.readFileSync('docs/roadmap/STATUS.json','utf8'));console.log('ok')"

# ✅ Candidate feature signals are discoverable
rg -n "feature flag|beta|preview|labs|TODO|FIXME" server apps packages docs
```

**Expected**: all checks succeed and candidate signals are present.

---

## Claude Prompt

```
You are a Summit/IntelGraph GA readiness engineer. Execute an evidence-first feature discovery and GA planning pass.

AUTHORITY ORDER:
1) docs/SUMMIT_READINESS_ASSERTION.md
2) docs/governance/CONSTITUTION.md and docs/governance/META_GOVERNANCE.md
3) docs/governance/AGENT_MANDATES.md and docs/ga/*
4) docs/feature-discovery-ga-prompt.md

OPERATING RULE:
Never defend the past. Only assert the present and dictate the future.

PRIMARY TASK:
1. Discover experimental/orphaned/underdeveloped features.
2. Score and select one candidate for GA.
3. Produce a full GA delivery package with tests/docs/CI evidence requirements.

MANDATORY CONSTRAINTS:
- Output evidence before narrative.
- Include rollback triggers and rollback steps for all high-impact changes.
- Do not bypass policy/security/evidence gates.
- Respect module boundaries unless coupling is explicitly required.

EVIDENCE REQUIREMENTS:
- File paths and line ranges
- Commit references
- Existing tests and coverage signals
- Feature flags/config toggles
- Dependency and blocker map

MAESTRO FORMAT REQUIREMENT:
Include explicit sections:
- MAESTRO Layers
- Threats Considered
- Mitigations

STRICT OUTPUT ORDER:
1) UEF Evidence Bundle
2) High-Level Summary + 7th-Order Implications
3) Full Architecture
4) Implementation Plan (all files, no placeholders)
5) Tests Plan (unit/integration/e2e/perf/security)
6) Documentation Plan
7) CI/CD and Gate Plan
8) PR Package (commit intent, reviewer checklist, rollback)
9) Future Roadmap
10) Final GA Checklist

QUALITY BAR:
- Reference concrete files and commands, not generic statements.
- Clearly separate present-state evidence from future-state recommendations.
- Flag unknowns as "Deferred pending <missing evidence>".

RESPONSE STYLE:
- Deterministic and concise.
- Cite files over opinions.
- End with a final, actionable go/no-go recommendation.
```

---

## Acceptance Criteria

- [ ] Evidence bundle appears before any narrative sections
- [ ] One GA candidate selected with explicit scoring rationale
- [ ] Rollback strategy included for selected candidate
- [ ] MAESTRO sections present (layers, threats, mitigations)
- [ ] CI/GA gate requirements are explicit and testable
- [ ] Final go/no-go recommendation is explicit

---

## Follow-Up Prompts

After this prompt is complete:

1. Run one Core GA implementation prompt (#01/#03/#08/#09/#11/#12) aligned to the selected candidate.
2. Run `make smoke` and collect evidence artifacts.
3. Update `docs/roadmap/STATUS.json` with completion state and blockers.

---

## References

- Canonical prompt: `docs/feature-discovery-ga-prompt.md`
- Roadmap state: `docs/roadmap/STATUS.json`
- Readiness assertion: `docs/SUMMIT_READINESS_ASSERTION.md`
- Governance authority: `docs/governance/CONSTITUTION.md`
