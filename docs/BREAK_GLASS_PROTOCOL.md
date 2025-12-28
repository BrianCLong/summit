# Break-Glass Protocol

**Effective Date:** 2025-12-26
**Status:** ENFORCED

## Overview
This protocol defines the exceptional circumstances under which the automated release gates and safety controls of Summit may be bypassed.

## Triggers
Break-glass is authorized ONLY for:
1.  **Severity 1 Incidents**: System outages or data integrity loss requiring immediate remediation.
2.  **Security Patches**: Critical vulnerability fixes (CVSS > 9.0) blocked by false-positive gates.
3.  **Governance Directives**: Written order from the Head of Engineering or CISO.

## Protocol Steps
1.  **Log the Incident**: An incident ticket must be created FIRST.
2.  **Execute Break-Glass**:
    ```bash
    ./scripts/break_glass.sh --user <username> --reason <ticket-id>
    ```
3.  **Verify**: Ensure `.break_glass` file is present.
4.  **Execute Operation**: Run the blocked deployment or release.
5.  **Revoke**:
    ```bash
    rm .break_glass
    ```
6.  **Post-Mortem**: All break-glass events trigger an automatic audit review.

## Auditing
All break-glass actions are logged to `audit/break_glass.log`. This log is immutable and replicated to the Provenance Ledger.
