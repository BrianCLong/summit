# Policies

Examples for querying OPA:

```bash
curl -s -X POST $OPA_URL/v1/data/intelgraph/tenant -d '{"input": {"auth": {"tenantId": "t1", "role": "TenantAdmin"}, "resource": {"tenantId": "t1"}, "action": "createEntity"}}'
```
