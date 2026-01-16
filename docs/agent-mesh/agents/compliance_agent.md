# Compliance Agent Contract

## Responsibilities
- Verify adherence to regulatory frameworks (SOC2, ISO27001).
- Collect and index evidence for controls.
- Generate compliance snapshots and reports.
- Validate evidence integrity.

## Policy Gates
- **Missing Evidence**: Block release if required evidence for a control is missing.
- **Stale Evidence**: Warn or block if evidence is older than policy TTL.
- **Signature Verification**: Fail if artifacts are not properly signed.

## Inputs Schema
```json
{
  "type": "object",
  "properties": {
    "action": { "type": "string", "enum": ["verify", "collect", "report"] },
    "scope": { "type": "array", "items": { "type": "string" } },
    "evidence_refs": { "type": "array", "items": { "type": "string" } }
  }
}
```

## Outputs Schema
```json
{
  "type": "object",
  "properties": {
    "status": { "type": "string", "enum": ["compliant", "non_compliant"] },
    "gap_analysis": { "type": "object" },
    "report_uri": { "type": "string" }
  }
}
```

## Evidence Artifacts
- **Compliance Snapshot**: JSON dump of current compliance state.
- **Gap Analysis Report**: Markdown/PDF report of missing controls.
- **Verification Log**: Audit trail of the verification process.
