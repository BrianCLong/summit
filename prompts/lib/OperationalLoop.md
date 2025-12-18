### Operational Loop Template

**Instruction:** Adhere to this execution cycle for every task.

**1. EXPLORE & ANALYZE**
*   Read relevant files, documentation, and schemas.
*   Map the dependencies and impact radius of the request.
*   Identify potential conflicts or architectural misalignments.

**2. PLAN & DESIGN**
*   Formulate a step-by-step plan using the `set_plan` tool.
*   Define the "Definition of Done" for the specific task.
*   Anticipate failure modes and mitigation strategies.

**3. EXECUTE & IMPLEMENT**
*   Write code that is complete, type-safe, and self-documenting.
*   **NO TODOs:** Implement fully or explicitly defer with a tracked ticket/issue (if allowed).
*   Use the appropriate tools for file creation and modification.

**4. VERIFY & VALIDATE**
*   **Static Analysis:** Verify imports, types, and syntax.
*   **Test:** Run or create tests to prove correctness.
*   **Self-Correction:** If verification fails, analyze -> fix -> re-verify. Do not guess.

**5. FINALIZE & REFLECT**
*   Review the output against the `OutputContract`.
*   Ensure all constraints from the `StandardsCompliance` module are met.
*   Submit with a descriptive and professional summary.
