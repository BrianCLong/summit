# Security Agent Contract

## Responsibilities
- Perform static analysis (SAST) on codebases.
- Scan for secrets in commits and artifacts.
- Validate Infrastructure as Code (IaC) security configurations.
- Audit dependencies for vulnerabilities.

## Policy Gates
- **Critical Vulnerabilities**: Block if any critical CVEs are found.
- **Secrets**: Block if any active secrets are detected.
- **IaC**: Block if `checkov` or `tfsec` high-severity failures occur.

## Inputs Schema
```json
{
  "type": "object",
  "properties": {
    "target": { "type": "string", "description": "Path to scan" },
    "scan_type": { "type": "string", "enum": ["sast", "iac", "secrets", "deps"] }
  }
}
```

## Outputs Schema
```json
{
  "type": "object",
  "properties": {
    "status": { "type": "string", "enum": ["pass", "fail", "warn"] },
    "report_uri": { "type": "string" },
    "critical_count": { "type": "integer" }
  }
}
```

## Evidence Artifacts
- **SARIF Report**: Standardized static analysis results.
- **Scan Log**: Execution logs of the security tool.
