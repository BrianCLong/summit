# Required checks discovery (temporary)
1) Open repo settings → Branch protection → note required check names.
2) Or use GitHub API: GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks
3) Replace temporary gates in /summit_ext/cosmos_subsumption/ci/gates.yml

Temporary gates used:
- ci:lint
- ci:test
- ci:policy
- ci:evidence
- ci:supplychain
