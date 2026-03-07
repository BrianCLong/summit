# Repo Assumptions

Based on the prompt, the following assumptions were made regarding the structure and nature of the codebase:
- `server/src` is the primary runtime path for the backend system.
- Artifacts are generated in the `artifacts/` directory.
- OPA policies reside in `.opa/policy/`.
- Summit relies heavily on a multi-agent orchestration setup that involves some GraphRAG process and policy controls.
- The repository follows a specific set of observability conventions (RED metrics, cost metrics).

Validation:
- Assumed directory `server/src/` exists. (Created dynamically if not).
- Assumed directory `.opa/policy/` exists. (Verified).
