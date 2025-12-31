# Safety & Governance Guardrails

Simulations are powerful but must be strictly governed to prevent misuse or confusion with real operational data.

## 1. The "Read-Only" Prime Directive

*   **Code Level**: The `StrategicSimulationEngine` class does not import any database writers, ORMs, or API clients that can mutate state. It operates purely on in-memory `SimulationSnapshot` objects.
*   **Infrastructure Level**: If deployed as a microservice, it should have a read-only database role (if it fetches its own data) or no database access at all (relying on passed payloads).

## 2. Policy Enforcement

*   **Access Control**: Only users with `PLANNING` or `ADMIN` roles can initiate strategic simulations.
*   **Scope Limits**: A user can only simulate scenarios for tenants they have access to. The engine enforces this by filtering `recentUsage` events based on `affectedTenants` or the caller's scope.

## 3. Resource Protection

*   **Timeouts**: Simulation requests must timeout after 5 seconds to prevent CPU exhaustion.
*   **Data Cap**: The `recentUsage` array in a snapshot is capped (e.g., last 1000 events) to ensure O(N) complexity stays manageable.

## 4. Fail-Closed Defaults

*   **Missing Data**: If a snapshot lacks critical data (e.g., missing quota definitions for a tenant in the usage log), the simulation alerts or fails rather than guessing defaults.
*   **Invalid Parameters**: Negative multipliers or budgets result in immediate rejection.
