# Day 1: Deploy & Verify

## Objectives
- Deploy the Summit platform using secure overlays.
- Verify system health.
- Perform initial configuration.

## 1. Prepare Configuration
1. Clone the reference deployment repository.
2. Navigate to `deployment/overlays/prod-secure`.
3. Create a `secrets.yaml` with your database credentials and license key (encrypted via SOPs or SealedSecrets recommended).
4. Update `kustomization.yaml` to set your specific domain names and replicas.

## 2. Deploy
Run the following command to deploy to the `summit` namespace:

```bash
kubectl apply -k deployment/overlays/prod-secure -n summit
```

## 3. Verify Deployment
Wait for all pods to be ready:

```bash
kubectl wait --for=condition=ready pod --all -n summit --timeout=300s
```

Check logs for any errors:

```bash
kubectl logs -l app=summit-api -n summit
```

## 4. Smoke Test
1. Access the Summit Console at `https://<your-domain>`.
2. Log in with the initial admin credentials (found in the deployment output or logs).
3. Verify that the "System Health" dashboard shows all green.

## 5. Rollback (If needed)
If the deployment fails, rollback to the previous state:

```bash
kubectl delete -k deployment/overlays/prod-secure -n summit
```
*Note: For production, use `kubectl rollout undo` if updating an existing deployment.*

## Success Criteria
- Summit Console is accessible via HTTPS.
- User can log in.
- Data persistence verified (restart a pod and check data).
