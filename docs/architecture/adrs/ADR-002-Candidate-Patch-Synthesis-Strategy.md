# ADR 002: Candidate Patch Synthesis Strategy

**Date**: 2024-03-08
**Status**: Proposed
**Context**: Phase 4 of RAE currently generates *conceptual* `ReconstructionBundles` containing file paths and commit references. To allow the Software Time Machine to physically simulate alternate histories, these conceptual bundles must be converted into git-applicable `.diff` files.

**Decision**: We will introduce a Phase 4.5 "Patch Synthesizer". It will consume the `ReconstructionBundle` JSON, retrieve the referenced historical `CodeFragments`, merge them chronologically, and generate standard `git diff` patches. We will prioritize a lightweight string-based merging strategy initially, deferring AST-based repair until patch failure rates demand it.

**Consequences**:
* **Positive**: Closes the loop from "conceptual recovery" to "executable reconstruction." Enables agents to apply patches, build, and run tests on candidate architectures.
* **Negative**: String-based merging will likely produce patches with syntax errors (e.g., missing imports, unclosed braces). This will push the burden of fixing compilation errors to an iterative Agent loop.
