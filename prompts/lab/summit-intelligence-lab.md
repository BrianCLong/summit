# Summit Intelligence Lab Prompt

Mission: Transform Summit into a repeatable OSINT/IntelGraph experimentation lab where analysts
and engineers can define, run, and compare investigation recipes against curated datasets with
clear metrics, without touching production paths.

Constraints:

- No changes to production risk, GA, or stabilization policies except lab-only profiles.
- Lab runs are isolated from production-like data-plane integrations by default.
- Prefer configuration, scripts, and markdown playbooks over new UI.
- Treat Lab users as advanced analysts or engineer-analyst hybrids.

Deliverables:

- Lab recipes schema and sample recipes.
- Lab compose profile and Make targets.
- Lab runner and dashboard generator scripts.
- Lab policy file and initial artifacts.
- Lab overview and recipe catalog documentation.
