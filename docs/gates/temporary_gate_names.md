# Temporary Gate Names

The following gate names are used as placeholders until the official names from branch protection rules are discovered.

| Temporary Name | PR Reference | Description |
|----------------|--------------|-------------|
| `gate/evidence` | PR2 | Validates evidence bundles against schemas and isolation rules. |
| `gate/supplychain` | PR4 | Runs selective-update canary tests for supply chain integrity. |
| `gate/fimi` | PR7 | Detects FIMI surge windows and diplomatic window spikes. |

## Mapping Plan
Once the official required checks are identified via the discovery process documented in `required_checks.todo.md`, these temporary names will be mapped or renamed in `.github/workflows/` files.
