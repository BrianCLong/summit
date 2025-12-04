# Network Policy Guide

## Overview
This application uses a default-deny Network Policy to enforce strict egress and ingress controls.
By default:
- **Ingress**: Only allowed from the Ingress Controller and other pods in the same namespace.
- **Egress**: Only allowed to Kubernetes DNS. All other outbound traffic is BLOCKED.

## Modifying the Policy

The policy is defined in `templates/networkpolicy.yaml`.

### Allowing External Traffic
To allow the application to connect to an external service (e.g., a database, third-party API):

1. **Identify the Destination**:
   - For internal K8s services: Use `podSelector` and `namespaceSelector`.
   - For external IPs (AWS RDS, APIs): Use `ipBlock`.

2. **Edit `templates/networkpolicy.yaml`**:
   Add a new rule under the `egress` section.

   **Example: Allow Access to External Postgres (RDS)**
   ```yaml
   - to:
       - ipBlock:
           cidr: 192.168.1.50/32
     ports:
       - protocol: TCP
         port: 5432
   ```

   **Example: Allow Access to Public Internet (e.g., for 3rd party API)**
   *Warning: Be as specific as possible with CIDR blocks.*
   ```yaml
   - to:
       - ipBlock:
           cidr: 0.0.0.0/0
           except:
             - 10.0.0.0/8
             - 192.168.0.0/16
             - 172.16.0.0/12
     ports:
       - protocol: TCP
         port: 443
   ```

### Verification
After applying changes, verify connectivity:
```bash
kubectl exec -it <pod-name> -- curl -v https://target-service.com
```
If the connection hangs, the Network Policy is likely dropping the packet. Check `kubectl get networkpolicy` and ensure labels match.
