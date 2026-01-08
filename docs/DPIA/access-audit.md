# Data Protection Impact Assessment (DPIA): Access Audit System

## 1. Description of Processing

The system collects and stores immutable logs of privileged access actions.

- **Data Collected**: User ID, Roles, IP Address (redacted by default), Resource ID, Action, RFA Reason.
- **Purpose**: Security auditing, compliance, incident response.

## 2. Necessity and Proportionality

- **Lawful Basis**: Legitimate Interest (Security), Legal Obligation (Compliance).
- **Proportionality**: Only privileged actions are logged in detail. Read access to non-sensitive data is logged as aggregates or standard access logs.

## 3. Risks to Rights and Freedoms

- **Risk**: Unauthorized access to audit logs (revealing user patterns).
  - **Mitigation**: Strict ABAC for audit log access. Hash chaining prevents tampering.
- **Risk**: Excessive retention.
  - **Mitigation**: Automated retention policies (180 days default).

## 4. Measures to Address Risks

- **Redaction**: IP addresses masked to /24 by default.
- **Access Control**: Dual-control required for forensics scope (unmasked IPs).
- **Encryption**: Logs encrypted at rest (S3/DB) and in transit.
