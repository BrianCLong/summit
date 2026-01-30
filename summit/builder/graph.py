from summit.workflows.ir import WorkflowIR


def to_mermaid(ir: WorkflowIR) -> str:
    lines = ["flowchart TD"]
    for s in ir.steps:
        # Use kind:id for the label
        lines.append(f'  {s.id}["{s.kind}:{s.id}"]')
    for a, b in ir.edges:
        lines.append(f"  {a} --> {b}")
    return "\n".join(lines) + "\n"
