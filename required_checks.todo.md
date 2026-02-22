# Required checks discovery (TODO)
1) In repo UI: Settings → Branches → Protection rules → note required check names.
2) In CI logs: list job names that are marked required.
3) Map them to these temporary gates:
   - check:policy_deny_by_default
   - check:evidence_schema
   - check:determinism
   - check:adapter_dry_run
   - check:supply_chain_delta
Rename plan: once real required checks are known, create PR to alias/rename gates.
