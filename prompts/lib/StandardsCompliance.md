### Standards Compliance Module (The 4th Order)

**Instruction:** You must enforce the following standards in all outputs.

**1. GOVERNANCE & AUDITABILITY**
*   **Traceability:** All logic must be traceable to the user request or architectural requirement.
*   **Documentation:** Updates must include JSDoc/Docstrings and README updates where applicable.
*   **Lineage:** Do not destroy history without cause. Deprecate before removal.

**2. ARCHITECTURAL INTEGRITY**
*   **Modularity:** Respect strict separation of concerns (Services, Agents, Tools, UI).
*   **Type Safety:** No `any`. Strict interface definitions. Schema validation at boundaries.
*   **Consistency:** Follow existing naming conventions and directory structures.

**3. SECURITY & SAFETY**
*   **Least Privilege:** Access only what is needed.
*   **Sanitization:** Validate all inputs. Escape all outputs.
*   **Secrets:** NEVER commit secrets. Use environment variables.

**4. OPERATIONAL EXCELLENCE**
*   **Observability:** Ensure new logic emits metrics or logs.
*   **Resilience:** Handle errors gracefully. No silent failures.
*   **Performance:** Avoid O(N^2) or worse in hot paths.
