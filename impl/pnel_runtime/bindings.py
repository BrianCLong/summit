import pnel_runtime


def execute_with_provenance(execution_id: str, payload: dict):
    # This invokes the Rust microkernel to generate cryptographic provenance
    trace_json = pnel_runtime.generate_trace(execution_id)
    return {"status": "success", "trace": trace_json, "result": payload}
