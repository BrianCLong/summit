import os

from summit.workflows.ir import Step, WorkflowIR

from .spec import BuilderSpec


def plan_from_spec(spec: BuilderSpec) -> WorkflowIR:
    # Feature flag check
    if os.environ.get("SUMMIT_BUILDER_ENABLED") != "1":
        raise PermissionError("Summit Builder is disabled. Set SUMMIT_BUILDER_ENABLED=1 to use this feature.")

    # Basic extraction-first planner (Template: extraction_v0)
    steps = [
        Step(id="classify", kind="classify", config={"types": spec.document_types}),
        Step(id="extract", kind="extract", config={"schema": spec.target_schema}),
        Step(id="validate", kind="validate", config={"mode": "schema"}),
    ]
    edges = [("classify", "extract"), ("extract", "validate")]

    return WorkflowIR(
        steps=steps,
        edges=edges,
        meta={"template": "extraction_v0"}
    )
