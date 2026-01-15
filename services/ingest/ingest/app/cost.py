import hashlib
import json
from datetime import datetime
from typing import Any, Literal

# --- Data Structures ---

OperationType = Literal["query", "ingest", "export", "storage_growth"]

# --- Unit Calculator ---

LATEST_WEIGHTS_VERSION = "v1"

WEIGHTS = {
    "v1": {
        "query": {
            "base": 10,
            "complexity_factor": 2,
            "rows_scanned_factor": 0.01,
            "rows_returned_factor": 0.1,
            "cpu_ms_factor": 0.5,
        },
        "ingest": {
            "base": 5,
            "io_bytes_factor": 0.0001,
            "objects_written_factor": 1,
        },
        "export": {
            "base": 20,
            "io_bytes_factor": 0.0002,
            "objects_written_factor": 2,
        },
        "storage_growth": {
            "base": 1,
            "io_bytes_factor": 0.0001,
        },
    }
}


def calculate_cost_units(
    operation_type: OperationType,
    dimensions: dict[str, Any],
    version: str = LATEST_WEIGHTS_VERSION,
) -> int:
    """Calculates a deterministic cost in abstract units."""
    weights = WEIGHTS.get(version)
    if not weights:
        raise ValueError(f"Unknown cost calculation version: {version}")

    op_weights = weights[operation_type]
    units = op_weights["base"]

    if operation_type == "ingest" or operation_type == "export":
        units += dimensions.get("io_bytes", 0) * op_weights["io_bytes_factor"]
        units += (
            dimensions.get("objects_written", 0) * op_weights["objects_written_factor"]
        )

    return round(units)


# --- Emitter ---


def _hash_identifier(identifier: str) -> str:
    """Hashes an identifier using SHA256."""
    return hashlib.sha256(identifier.encode()).hexdigest()


def _generate_event_id(correlation_id: str, operation_type: OperationType) -> str:
    """Generates a deterministic, idempotent ID for the cost event."""
    hash_input = f"{correlation_id}:{operation_type}".encode()
    digest = hashlib.sha256(hash_input).hexdigest()
    return f"cost-{digest[:16]}"


def emit_cost_event(
    operation_type: OperationType,
    dimensions: dict[str, Any],
    tenant_id: str,
    scope_id: str,
    correlation_id: str,
) -> None:
    """Constructs and 'emits' a cost event by logging to stdout."""
    units = calculate_cost_units(operation_type, dimensions)

    event = {
        "id": _generate_event_id(correlation_id, operation_type),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "tenantHash": _hash_identifier(tenant_id),
        "scopeHash": _hash_identifier(scope_id),
        "operationType": operation_type,
        "units": units,
        "dimensions": dimensions,
        "correlationId": correlation_id,
    }

    print(json.dumps({"type": "CostEvent", **event}))
