# Logging Matrix: SaaS Data Theft Detection

## Goal
Map log sources and events required to detect the ShinyHunters-branded attack chain.

| Source | Event Type | Purpose | Detection Mapping |
| --- | --- | --- | --- |
| IdP (Okta/Entra) | MFA Enrollment | Detect attacker device registration | SHINY-001 |
| IdP (Okta/Entra) | Login | Detect impossible travel or new geo | Correlation |
| SaaS (M365/Workspace) | OAuth Consent | Detect malicious app authorization | SHINY-001, SHINY-003 |
| Salesforce | Report Export | Detect bulk data exfiltration | SHINY-002 |
| Salesforce | Bulk API Download| Detect high-volume data theft | SHINY-002 |
| Workspace | Google Takeout | Detect full account data export | SHINY-003 |
| Gmail | Message Sent/Deleted| Detect phishing and track cleanup | SHINY-004 |

## Configuration Requirements
- **Salesforce**: Enable Salesforce Shield or Event Monitoring to capture `ReportEventStream` and `ApiEventStream`.
- **Google Workspace**: Ensure Gmail audit logs and Google Takeout logs are being exported to the SIEM.
- **M365**: Enable Unified Audit Log (UAL).
