# Repo Assumptions & Reality Check

## Verified
*   **Repo Structure**: `summit/` is the core Python package, `tests/` contains tests.
*   **Package Management**: `requirements.in` lists `fastapi`, `uvicorn`, `httpx`, `pytest`.
*   **Model Registry**: `summit/registry/model.py` defines schema, `summit/registry/store.py` loads it. No existing data files found in `summit/registry/`.
*   **LLM Config**: `litellm.config.yaml` exists in root, implying use of `litellm` proxy, but no direct python usage found in `summit/`.
*   **Sandbox**: `summit/agents/sandbox.py` handles tool execution sandbox.
*   **Tests**: `tests/test_sandbox.py` exists, confirming `pytest` usage.

## Assumptions
*   **Provider Location**: Since no explicit "provider" module was found (only scattered adapters in `packages/`), we assume `summit/providers/` is the correct place for new core providers.
*   **Registry Data**: We assume `summit/registry/data/` is the correct place to store registry JSON files.
*   **Artifacts**: We assume `artifacts/` directory should be created in the root for outputs.

## Must-not-touch
*   `.archive/`
*   `.disabled/`
*   `.quarantine/`
