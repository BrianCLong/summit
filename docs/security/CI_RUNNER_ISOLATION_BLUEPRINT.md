# CI Runner Isolation Blueprint

## Purpose

This blueprint hardens self-hosted CI/CD runners against lateral movement, secret theft,
and persistence by enforcing **ephemeral, least-privilege, sandboxed execution**.
It is designed for GitHub Actions, GitLab Runner, Forgejo Actions, and Kubernetes-backed
runners.

## Threat Model (Abbreviated)

- **Untrusted code execution**: PRs, forks, or dependencies execute attacker-controlled code.
- **Host escape**: privileged or host-mounted runners allow container breakout.
- **Persistence between jobs**: shared workspace, caches, or long-lived runners leak data.
- **Secret exfiltration**: broad-scoped tokens or inherited credentials.
- **Lateral movement**: network access to internal services and control planes.

## Security Objectives

1. **Ephemeral runners**: new instance per job, destroyed on completion.
2. **No host-level execution for untrusted code**: container/VM isolation by default.
3. **Least-privilege identities**: short-lived, job-scoped tokens; no static creds.
4. **Workspace hygiene**: guaranteed clean checkout; no cross-job cache secrets.
5. **Egress control**: allowlist external endpoints; block internal control planes.
6. **Policy enforcement**: encode rules as policy-as-code (OPA/Gatekeeper/Kyverno).

---

## Reference Architecture

**Control Plane**

- CI orchestration system (GitHub/GitLab/Forgejo)
- Runner provisioner (auto-scaler or ephemeral runner controller)
- Policy engine (OPA/Gatekeeper/Kyverno)

**Execution Plane**

- Ephemeral runner VM or pod
- Container sandbox (gVisor/Kata) for untrusted jobs
- Short-lived identity (OIDC → cloud role)
- Minimal network egress + DNS allowlist

**Data Plane**

- Artifact store (scoped, signed)
- Secret manager (OIDC-based, per job)
- Observability sink (audit logs, traces)

---

## Provider-Specific Guidance

### GitHub Actions (Self-Hosted)

**Preferred**: ephemeral runners via Kubernetes or ephemeral VM provisioning.

**Minimum Controls**

- Use `actions/runner-controller` with ephemeral runners.
- Use job-level `permissions` and OIDC (no static cloud keys).
- Disable `sudo` and privileged containers for untrusted jobs.
- Clean workspace at job start and end.

**Sample Controls**

- Runner labels: `self-hosted`, `ephemeral`, `sandboxed`.
- `permissions: read-all` (override per job if needed).

### GitLab Runner (Self-Hosted)

**Preferred**: `docker+machine` or Kubernetes executor with autoscaling.

**Minimum Controls**

- Disallow privileged mode; no `/var/run/docker.sock` mounts.
- Use isolated namespaces per job.
- Enforce `FF_NETWORK_PER_BUILD=1` to isolate networking.
- Use OIDC with cloud provider roles for artifacts/secrets.

### Forgejo Actions

**Preferred**: container or VM executor with ephemeral lifecycle.

**Minimum Controls**

- Avoid host runner mode for untrusted repos.
- Enforce job-level token scoping.
- Disable shared workspace reuse; always clean checkout.

### Kubernetes-backed Runners

**Preferred**: short-lived pods with a sandbox runtime.

**Minimum Controls**

- Use gVisor/Kata for untrusted jobs.
- NetworkPolicy: allowlist only required egress.
- PodSecurity: `runAsNonRoot`, `readOnlyRootFilesystem`, drop all caps.

---

## Policy-as-Code Examples (OPA)

### Example 1: Block Privileged Jobs

```rego
package cicd.runner

default allow = false

allow {
  not input.job.privileged
  not input.job.mounts[_] == "/var/run/docker.sock"
}
```

### Example 2: Require Ephemeral Runner Label

```rego
package cicd.runner

default allow = false

allow {
  input.job.labels[_] == "ephemeral"
}
```

### Example 3: Enforce Job Token TTL

```rego
package cicd.runner

default allow = false

allow {
  input.job.token_ttl_minutes <= 60
}
```

---

## Hardening Checklist

### Runner Provisioning

- [ ] Ephemeral runner per job (VM or pod)
- [ ] No shared workspace or persistent disk across jobs
- [ ] Immutable base image with minimal packages

### Identity & Secrets

- [ ] OIDC-based job identity (no static keys)
- [ ] Job-scoped secrets only (deny for forks)
- [ ] Secret access via policy engine (OPA/Kyverno)

### Isolation & Sandbox

- [ ] Container runtime sandbox (gVisor/Kata) for untrusted jobs
- [ ] Drop all Linux capabilities; disallow privileged mode
- [ ] Read-only root filesystem; no host mounts

### Network Controls

- [ ] Egress allowlist with DNS filtering
- [ ] Block access to control plane, metadata endpoints, and internal service mesh
- [ ] Enforced per-job NetworkPolicy (K8s)

### Supply Chain Integrity

- [ ] Signed base images + SBOM verification
- [ ] Cache isolation: no cross-repo caches containing secrets
- [ ] Artifact signing (SLSA provenance)

---

## Minimum Baseline (If You Must Run on a Host)

If container or VM isolation is not possible, **treat the host as compromised** and:

- Separate host runners per trust tier (trusted vs untrusted repos).
- Rotate host after each run (re-image, destroy workspace).
- Deny any persistent tokens or SSH keys on the host.
- Restrict outbound network to essential endpoints only.

---

## Operational Monitoring

- Alert on: privileged jobs, unexpected mounts, outbound network spikes.
- Monitor runner lifecycle events (create → run → destroy).
- Log job identity, token TTLs, and policy decisions.

---

## Implementation Next Steps

1. Pick execution tier: **K8s ephemeral pods** or **ephemeral VMs**.
2. Enforce policies via OPA/Gatekeeper/Kyverno.
3. Migrate secrets to OIDC + vault flow.
4. Add audit dashboards for runner lifecycle and policy denials.

---

## References

- Forgejo Actions Security: https://forgejo.org/docs/next/user/actions/security/
- GitLab Runner Security: https://docs.gitlab.com/runner/security/
- GitHub Actions Security: https://docs.github.com/actions/security-guides/security-hardening-for-github-actions
