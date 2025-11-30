
## LLM Routing Governance

### Principles
-   **No Red-Flag Use Cases**: Models cannot be routed for disallowed categories (surveillance, manipulation).
-   **Trusted Models Only**: Critical tasks must use models with signed agreements/SLAs.
-   **Data Residency**: Router must respect `eu-only` or similar constraints defined in `RoutingRule`.

### Enforcement
-   `RouterService` throws if no valid model path exists under governance constraints.
