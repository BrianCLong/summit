# Feature Flag Readiness Sweep Audit

## Purpose
This document tracks the hardening and isolated testing of specific local feature flags outside of the central registry. Our objective was to ensure safe fail-open/fail-closed characteristics, introduce a direct local kill-switch to bypass network or registry problems, and ensure deep structural logging for evaluation boundaries.

## Target Audits
1. **`search.scout` (Flagsmith integration) in `services/scout/src/main.py`**
   - **Current state**: Relied on HTTP network calls to edge flagsmith API to evaluate. When unavailable, defaulted to silent fallback with no local override. Lacked structured observability logs.
   - **Improvements**:
     - Introduced `SCOUT_SEARCH_FORCE_DISABLE` local kill-switch check that intercepts network attempts immediately.
     - Implemented `logger.info("event:feature_flag.evaluated ...")` to explicitly document whether evaluation succeeded due to kill-switch, missing environment keys, API results, or default fallbacks.
     - Added comprehensive unit tests for `is_enabled` evaluation scenarios verifying `403` vs `200` endpoint gating in `tests/test_main.py`.

2. **`FEATURE_PRIORITIZER_GNN` in `services/pipeline/prioritizer/__init__.py`**
   - **Current state**: Native os.environ boolean flag that lacked observability for operations when routing code paths.
   - **Improvements**:
     - Added direct observability logging (`logger.info`) in `get_prioritizer()` routing stub logic, specifying `result=True/False` alongside descriptive routing reasons.
     - Provided a targeted feature-routing test `services/pipeline/tests/test_prioritizer_flag.py` exercising the local environment evaluations across True and False states via monkeypatching.
