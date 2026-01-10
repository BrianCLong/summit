# Counter-Intel OSINT Playbook & Automation (v1)

Objective: update the counter-intel OSINT playbook and passive recon tooling to
support organization-level enumeration, multi-manifest scanning, and maintainer
corporate-domain checks while keeping collection passive and auditable.

Scope:

- Update `docs/playbooks/counter-intel-osint.md` with refreshed runbooks.
- Enhance `scripts/osint/passive_recon.py` and `scripts/osint/risk_model.py`.
- Refresh `docs/roadmap/STATUS.json` to record the change.
- Add the agent task spec under `agents/examples/`.

Constraints:

- Passive OSINT only (public metadata, registries, manifests).
- No credentialed crawling or intrusive scanning.
- Maintain deterministic, risk-ranked findings output.
