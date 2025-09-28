# Inventory Pack (Read-Only)

Run locally:
```bash
bash scripts/inventory/inventory_orgs.sh
bash scripts/inventory/inventory_clouds.sh
bash scripts/inventory/inventory_k8s_monitoring.sh
bash scripts/inventory/scan_ci_markers.sh
```

Paste-back template:

```
orgs: <slug1>, <slug2>
aws.accounts: (attach artifacts/aws.accounts.table.txt)
gcp.projects: (attach artifacts/gcp.projects.table.txt)
azure.subscriptions: (attach artifacts/azure.subscriptions.table.txt)
prom.endpoint: <url> (private)
grafana.endpoint: <url> (Viewer ok)
scm.ci.files:
  - <path1>
  - <path2>
```

