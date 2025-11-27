# High-Risk Use Case Registry (v1)

This registry defines the allowed and disallowed operational categories for the platform. It is enforced by the `GovernanceKernel`.

| Category | Risk Level | Status | Description |
|---|---|---|---|
| `defensive_security` | Low (Green) | **ALLOWED** | Protective measures, incident response, threat hunting. |
| `analytics` | Low (Green) | **ALLOWED** | Business intelligence, system metrics, performance analysis. |
| `foresight` | Medium (Yellow) | **CONDITIONAL** | Scenario planning, future forecasting. Requires human oversight. |
| `influence_operations` | High (Red) | **DENIED** | Active manipulation of public opinion or social engineering. |
| `authoritarian_surveillance` | Critical (Hard Red) | **DENIED** | Mass surveillance, privacy violation, oppression tools. |
