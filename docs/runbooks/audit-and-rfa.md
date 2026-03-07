# Audit and RFA Runbook

## Overview

This runbook covers the operation, forensics, and maintenance of the Access Audit and Reason-for-Access (RFA) system.

## Procedures

### 1. Generating an Evidence Bundle

Use the `auditctl` tool to generate a signed evidence bundle for an incident.

```bash
auditctl bundle --incident INC-123 --scope forensics --approver "admin1,compliance_officer"
```

### 2. Verifying Audit Chain Integrity

To verify the tamper-evident hash chain:

```bash
auditctl verify --start <start_hash>
```

### 3. Dual-Control Delete

Purging audit logs requires dual-control authorization.

1. Initiator requests purge for a specific range.
2. Approver signs the request.
3. System executes purge and writes a tombstone record with the justification and signatures.

## Alerts

- **High Impersonation Rate**: Investigate immediately. Check RFA reasons.
- **Audit Sink Failure**: System fails closed. Check Loki/S3 connectivity.
- **RFA Denial Spike**: May indicate policy misconfiguration or active probing.

## Scope

- `forensics`: Full access, including IP addresses (requires approval).
- `standard`: Redacted IPs, suitable for general review.
