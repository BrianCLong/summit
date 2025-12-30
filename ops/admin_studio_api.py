# ops/admin_studio_api.py


"""Admin Studio API helpers used by operational tooling."""

from collections.abc import Mapping
from copy import deepcopy

# In-memory store for feature flags (for demonstration purposes)
_DEFAULT_FEATURE_FLAGS: dict[str, bool] = {
    "new_feature": False,
    "experimental_ui": False,
}
_FEATURE_FLAGS: dict[str, bool] = deepcopy(_DEFAULT_FEATURE_FLAGS)


def toggle_feature_flag(flag_name: str, enable: bool) -> bool:
    """
    Toggles a feature flag in Admin Studio and updates its state in memory.
    """
    print(f"Toggling feature flag '{flag_name}' to {enable}.")
    if flag_name in _FEATURE_FLAGS:
        _FEATURE_FLAGS[flag_name] = enable
        return True
    print(f"Warning: Feature flag '{flag_name}' not found.")
    return False


def get_feature_flag_state(flag_name: str) -> bool:
    """
    Retrieves the current state of a feature flag.
    """
    return _FEATURE_FLAGS.get(flag_name, False)


def list_feature_flags() -> dict[str, bool]:
    """Return a copy of all known feature flags and their states."""
    return _FEATURE_FLAGS.copy()


def reset_feature_flags(seed: Mapping[str, bool] | None = None) -> dict[str, bool]:
    """
    Reset feature flags to defaults or to a provided seed mapping.

    Returns a copy of the updated feature flag state so callers cannot
    accidentally mutate the internal store.
    """

    _FEATURE_FLAGS.clear()
    _FEATURE_FLAGS.update(seed or _DEFAULT_FEATURE_FLAGS)
    return list_feature_flags()


def get_schema_registry_status() -> dict:
    """
    Stub for retrieving schema registry status from Admin Studio.
    """
    print("Getting schema registry status.")
    return {"status": "healthy", "schemas_registered": 15}


def get_connector_health(connector_id: str) -> dict:
    """
    Stub for retrieving health status of a specific connector.
    """
    print(f"Getting health for connector: {connector_id}")
    return {"status": "operational", "last_ingestion": "2023-08-25T10:00:00Z"}


def trigger_job_retry(job_id: str) -> bool:
    """
    Stub for triggering a job retry.
    """
    print(f"Triggering retry for job: {job_id}")
    return True


def trigger_job_backfill(job_id: str, start_time: str, end_time: str) -> bool:
    """
    Stub for triggering a job backfill.
    """
    print(f"Triggering backfill for job: {job_id} from {start_time} to {end_time}")
    return True


def search_audit_logs(query: str, start_time: str = None, end_time: str = None) -> list:
    """
    Stub for searching audit logs via Admin Studio.
    """
    print(f"Searching audit logs for query: '{query}' from {start_time} to {end_time}")
    return [{"event": "user_login", "user": "test_user"}]
