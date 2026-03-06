import sys

with open('.github/workflows/ci-security.yml', 'r') as f:
    lines = f.readlines()

new_lines = []
in_py_block = False
for line in lines:
    if "python - <<'PY'" in line:
        new_lines.append(line)
        in_py_block = True
    elif in_py_block and "PY" in line and not "REPORT_DIR" in line:
        new_lines.append(line)
        in_py_block = False
    elif in_py_block:
        # Keep indentation but remove the problematic part if any
        # Or just replace the whole block contents
        pass
    else:
        new_lines.append(line)

# Re-insert the correct block
content = ""
py_block = """import json
import os
from pathlib import Path

report_root = Path('aggregated-security')
files = sorted(str(p.relative_to(report_root)) for p in report_root.rglob('*') if p.is_file())
status = {
    "Secret scanning": os.environ.get('SECRET_STATUS', 'unknown'),
    "SAST": os.environ.get('SAST_STATUS', 'unknown'),
    "Semgrep": os.environ.get('SEMGREP_STATUS', 'unknown'),
    "Dependencies": os.environ.get('DEP_STATUS', 'unknown'),
    "Filesystem": os.environ.get('FS_STATUS', 'unknown'),
    "Container": os.environ.get('IMG_STATUS', 'unknown'),
    "Licenses": os.environ.get('LIC_STATUS', 'unknown'),
    "IaC": os.environ.get('IAC_STATUS', 'unknown'),
    "OPA policies": os.environ.get('OPA_STATUS', 'unknown'),
    "CIS benchmark": os.environ.get('CIS_STATUS', 'unknown'),
    "Baseline": os.environ.get('BASELINE_STATUS', 'unknown'),
    "DAST": os.environ.get('DAST_STATUS', 'failure'),
}
summary = {
    "reportCount": len(files),
    "reports": files,
    "statuses": status,
}
report_root.mkdir(parents=True, exist_ok=True)
with (report_root / 'security-summary.json').open('w', encoding='utf-8') as fh:
    json.dump(summary, fh, indent=2)
"""

final_lines = []
for line in lines:
    final_lines.append(line)
    if "python - <<'PY'" in line:
        for py_line in py_block.splitlines():
            final_lines.append(" " * 10 + py_line + "\\n")
        # Now we need to skip the old lines until PY
        # This is getting complex, I'll just rewrite the whole file.
