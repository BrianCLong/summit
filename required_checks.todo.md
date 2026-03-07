# Required Checks Discovery and Alignment Plan

## Objective
Align GitHub branch protection required check names with workflow job names used in this repository so golden-main merges remain deterministic and green.

## Discovery Steps (authoritative)
1. Open **GitHub → Settings → Branches → Branch protection rules**.
2. Record every required status check exactly as displayed.
3. Query API for confirmation:
   - `GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks`
4. Compare UI/API output with workflow job names in `.github/workflows/*.yml`.
5. Create a normalization PR that renames job IDs where mismatches exist.

## Temporary Internal Mapping (pending validation)
- `CI Core (Primary Gate) / CI Core Gate`
- `CI / Unit Tests`
- `GA Gate`
- `Release Readiness Gate`
- `SOC Controls`
- `Unit Tests & Coverage`
- `gate/evidence`
- `gate/supplychain`
- `gate/fimi`
- `lint`
- `typecheck`
- `build`
- `test`

## Rename Plan
- Keep existing checks stable until branch protection names are verified.
- Introduce aliases only when necessary to avoid check-history disruption.
- Update `.github/required-checks.yml` and any policy docs in same PR.
- Re-run branch protection verification after merge.

## Exit Criteria
- Required check names in branch protection match workflow job names exactly.
- No transient check-name drift remains in protection rules.
- Documentation reflects final canonical check list.
