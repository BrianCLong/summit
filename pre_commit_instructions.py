print("Running pre-commit checks...")
print("Linting files...")
import os
os.system("npx prettier --check evidence/templates/ops-hardening/ TRIAGE.md required_checks.todo.md")
print("Done.")
