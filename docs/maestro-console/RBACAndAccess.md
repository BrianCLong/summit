# RBAC & Access Control

Maestro enforces strict Role-Based Access Control to prevent unauthorized changes to the cognitive architecture.

## Roles

### Viewer
- **Permissions**: Read-only access to all dashboards, runs, and logs.
- **Restrictions**: Cannot modify agents, toggle loops, or run playbooks.
- **Use Case**: Junior analysts, stakeholders, auditors.

### Operator
- **Permissions**:
  - Manage Runs (Cancel/Retry).
  - Enable/Disable specific Playbooks.
  - Run Experiments.
- **Restrictions**: Cannot change global policies or critical SLO configs.
- **Use Case**: SREs, Senior Engineers.

### Admin
- **Permissions**: Full access, including Policy editing and Autonomic Loop configuration.
- **Use Case**: Platform Leads, System Architects.

## Implementation
RBAC is enforced at both the API layer (Middleware) and the UI layer (conditional rendering).
- **Frontend**: Buttons for sensitive actions are disabled/hidden for non-privileged users.
- **Backend**: API endpoints check `req.user.role` before executing mutations.
