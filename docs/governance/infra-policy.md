# Infrastructure Governance Policy

| Type | Description |
|---|---|
| Infrastructure Validation | Ensures modules have owner, version, and name. |
| Access Control | CI-only execution, local apply is strictly denied. |
| Policy Execution | All infrastructure runs are verified against `deny-by-default` OPA policies. |
