# Disaster Recovery Failover Drill

This runbook documents the procedure to fail over IntelGraph to a regional read replica and back out once the primary region is restored. Capture timestamps for each stage and attach screenshots of the Grafana and `kubectl get pods` dashboards to the DR evidence vault.

## Preparation

1. Ensure Terraform state reflects the latest deployment and that `var.read_replica_regions` lists all promoted regions.
2. Verify the provenance ledger from the most recent air-gap bundle export (`infra/airgap/dist/ledger/provenance-ledger.json`).
3. Confirm replication status in PostgreSQL:
   ```bash
   aws rds describe-db-cluster-endpoints --db-cluster-identifier intelgraph-primary
   ```
4. Confirm Redis Global Datastore status:
   ```bash
   aws elasticache describe-global-replication-groups --global-replication-group-id intelgraph-cache
   ```

## Failover execution

| Step | Action                                                                                | Notes                                                                                                                                           |
| ---- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Freeze ingestion by scaling worker deployments to zero in the impacted region.        | `kubectl scale deploy/intelgraph-worker --replicas=0 -n intelgraph`                                                                             |
| 2    | Promote the target read replica to primary using Terraform.                           | `terraform apply -var-file=dr-failover.tfvars -auto-approve`                                                                                    |
| 3    | Update Helm release with the new `regionSharding.defaultRegion` and tenant overrides. | `helm upgrade intelgraph airgap-charts/intelgraph-*.tgz -n intelgraph --values values/airgap.yaml --set regionSharding.defaultRegion=us-east-1` |
| 4    | Validate application health.                                                          | Run smoke tests and `kubectl get pods -n intelgraph`                                                                                            |
| 5    | Capture Grafana dashboards and `kubectl` output screenshots.                          | Store in DR evidence vault with timestamps.                                                                                                     |

## Backout

1. Rehydrate the original primary region resources with Terraform:
   ```bash
   terraform apply -var-file=primary-restore.tfvars -auto-approve
   ```
2. Promote the original primary back to write mode using the same procedure as the failover, but pointing to the recovered region.
3. Re-run Helm upgrade to move tenants back to their original regions using `regionSharding.tenants` overrides.
4. Resume ingestion by scaling worker deployments back to their steady state.
5. Verify provenance ledger alignment:
   ```bash
   python3 infra/airgap/verify_provenance.py resync-manifest.json infra/airgap/dist/ledger/resync-manifest.json
   ```
6. Document the drill outcome with timestamps for failover start, completion, backout start, and completion. Attach screenshots to the DR evidence vault and log the event in `status/DR-activity.log`.

## Evidence checklist

- [ ] Terraform plan and apply outputs stored in runbook evidence folder.
- [ ] `kubectl get pods -n intelgraph` screenshot before and after failover.
- [ ] Grafana latency dashboard screenshot for each region.
- [ ] Signed provenance ledger exported post-drill.
- [ ] Resync manifest diff report archived.
