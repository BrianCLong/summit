# Quickstart Commands

```bash
# Seed labels, milestones, and issues
bash tools/seed/seed-issues.sh

# Create sprint project board
export PROJECT_ID=$(gh project create --title "Proof-First Core GA" --format json | jq -r .id)

# Apply dashboards and alerts
kubectl apply -f ops/prometheus/rules.yaml
```
