## Required checks discovery
1) Repo settings → Branch protection → note required checks
2) CI UI → list check names exactly
3) Fill in `ci/required_checks.json` in PR2

Temporary gate names (rename once discovered):
- gate:evidence_contract
- gate:policy_no_secrets_in_logs
- gate:policy_network_egress_allowlist

Rename plan:
1) Add mapping old->new
2) Update branch protection
3) Remove old after 1 week
