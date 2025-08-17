# STIG Hardening Checklist

Baseline tasks to align the platform with DISA STIG guidance.

## Operating System / Container

- [ ] Apply latest security patches and updates.
- [ ] Disable unused services and ports.
- [ ] Enforce least privilege on file permissions.

## Kubernetes & Service Mesh

- [ ] Enable mTLS between all services (see `deploy/k8s/istio/peer-authentication.yaml`).
- [ ] Enforce service-to-service RBAC using Istio AuthorizationPolicy.
- [ ] Define Consul intentions to explicitly allow required service communication.

## Database

- [ ] Require TLS for PostgreSQL connections.
- [ ] Enable logging of failed and successful login attempts.
- [ ] Schedule regular backups and integrity checks.

## Application

- [ ] Audit log all user actions and security-relevant events.
- [ ] Validate all inputs and sanitize outputs.
- [ ] Ensure configuration secrets are sourced from secure storage.

## Monitoring & Reporting

- [ ] Ship audit logs to centralized SIEM.
- [ ] Generate STIG compliance reports for each release.
