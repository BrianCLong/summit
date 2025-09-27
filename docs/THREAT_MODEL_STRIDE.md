# Threat Model (STRIDE)

## STRIDE Threat Matrix

| Category | Example Threat | Severity (Low/Med/High) | Mitigation |
| --- | --- | --- | --- |
| Spoofing | Stolen JWT used to impersonate user | High | Short‑lived tokens, rotation, mTLS between services |
| Tampering | Graph data modified by unauthorized actor | High | Signed evidence references, immutable audit logs |
| Repudiation | User denies executing mutation | Medium | Append‑only runbook logs with user/time metadata |
| Information Disclosure | Leakage of investigation data | High | ABAC policies, row‑level resolver filters |
| Denial of Service | Massive query causing resource exhaustion | Medium | Rate limits, query depth/size guards |
| Elevation of Privilege | Bypassing RBAC to gain admin rights | High | RBAC enforcement, least‑privilege service accounts |

Regular reviews update severity based on exploit likelihood and impact.
