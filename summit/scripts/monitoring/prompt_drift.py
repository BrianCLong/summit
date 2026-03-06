import sys
import json
from pathlib import Path
from summit.prompts.load import load_prompt_artifact
from summit.prompts.lint import lint_prompt
# Assume we might run evals here too for drift detection

def check_drift():
    prompts_dir = Path("prompts")
    files = list(prompts_dir.glob("**/*.prompt.yaml"))

    report = {"files_checked": len(files), "lint_failures": 0, "failures": []}

    for f in files:
        try:
            data = load_prompt_artifact(f)
            errors = lint_prompt(data)
            if errors:
                report["lint_failures"] += 1
                report["failures"].append({"file": str(f), "errors": errors})
        except Exception as e:
            report["failures"].append({"file": str(f), "error": str(e)})

    print(json.dumps(report, indent=2))

    if report["lint_failures"] > 0:
        sys.exit(1)

if __name__ == "__main__":
    check_drift()
