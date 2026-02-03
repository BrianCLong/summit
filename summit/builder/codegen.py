from typing import Dict

from summit.workflows.ir import WorkflowIR


def generate_project_files(ir: WorkflowIR) -> dict[str, str]:
    # Very basic codegen skeleton
    files = {
        "workflow.py": f"# Generated Workflow\n# Template: {ir.meta.get('template', 'unknown')}\n\ndef run():\n    print('Running workflow with {len(ir.steps)} steps')\n",
        "README.md": "# Generated Project\n\nThis project was generated from a Workflow IR.\n"
    }
    return files
