# Agent Capability Graph Standards

The Agent Capability Graph (ACG) serves as the control plane for defining agent roles, permissions, evidence contracts, handoffs, budgets, and CI gates that every autonomous workflow must traverse before execution or merge.

## Import/Export Matrix
| Summit ACG object | Import from | Export to |
|-------------------|-------------|-----------|
| policy requirements | existing OPA/ABAC policy sources | CI required-check plan |
| workflow nodes | GitHub Actions workflow inventory | graph snapshot |
| evidence contract | existing evidence-bundle validators | report.json, stamp.json |
| performance budgets | k6/SLO gate policies | metrics.json |
| security findings | SBOM/vuln/SAST gates | graph violation records |

## Non-goals
- Not a workflow engine replacement
- Not a graph database mandate in MWS
- Not a generalized knowledge graph
- Not an autonomy bypass for existing required checks
