# Integration with IC Systems

## Overview
Summit is designed to be a "good citizen" within the IC Information Technology Enterprise (IC ITE). It integrates seamlessly with the Common Desktop Environment (CDE) and standard data exchanges.

## IC Desktop Integration

### Browser Compatibility
*   **Validated Browsers:** Summit is tested and validated on the standard IC builds of **Firefox ESR** and **Chrome Enterprise**.
*   **PKI/CAC Support:** Native support for client-side certificate authentication via the browser's certificate store.

### Widget Framework
*   **OZONE Widget Framework (OWF):** Summit components (Graph View, Map View) can be exposed as individual widgets compatible with OWF dashboards.

## Data Exchange Standards

### IC-ISM (Information Security Marking)
*   **Compliance:** All JSON exports include compliant `security` metadata objects.
*   **Example:**
    ```json
    {
      "id": "report-123",
      "content": "...",
      "security": {
        "classification": "TOP SECRET",
        "owner_producer": "USA",
        "sci_controls": ["SI", "TK"],
        "dissemination_controls": ["NOFORN"]
      }
    }
    ```

### CTM (Common Threat Model)
*   **Mapping:** Summit's internal graph ontology maps 1:1 with the IC Common Threat Model entities (Actor, Campaign, TTP, Indicator).

## API Integration

### GraphQL API
Summit exposes a full-featured GraphQL API for system-to-system integration.
*   **Endpoint:** `/graphql`
*   **Schema:** Self-documenting schema available via introspection.
*   **Auth:** Bearer Token (JWT) or mTLS Certificate.

### Webhooks
Real-time push notifications for event-driven integration with other IC tools (e.g., tipping a SIGINT selector system when a new entity is identified).

## Legacy System Connectors
*   **SQL Bridge:** ODBC/JDBC connectors for legacy Oracle/SQL Server databases.
*   **Mainframe:** 3270 screen scraping agents (via "Legacy Agent") for un-API'd legacy systems.
