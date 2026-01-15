#!/usr/bin/env python3
"""
Security Review Checklist Generator
Generates a checklist for PRs based on modified files.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent

COMMON_CHECKLIST = """
## Security Review Checklist

- [ ] **Authentication**: Verify that new endpoints are authenticated.
- [ ] **Authorization**: Verify that the user has the correct permissions (RBAC/ABAC).
- [ ] **Input Validation**: Ensure all inputs are validated using Zod/Joi.
- [ ] **Output Encoding**: Ensure no raw HTML is rendered from user input (XSS).
- [ ] **Secrets**: Ensure no secrets are committed or logged.
- [ ] **Logging**: Ensure no sensitive PII is logged.
"""

DB_CHECKLIST = """
### Database Changes
- [ ] **Migrations**: Review migration scripts for data loss risks.
- [ ] **Injection**: Ensure all queries use parameterized inputs (no string concatenation).
- [ ] **Indexing**: Verify indices for performance (DoS prevention).
"""

FRONTEND_CHECKLIST = """
### Frontend Changes
- [ ] **XSS**: Verify usage of `dangerouslySetInnerHTML` is justified and sanitized.
- [ ] **Dependencies**: Check for new npm packages.
- [ ] **State**: Ensure sensitive data is not stored in LocalStorage.
"""


def generate_checklist():
    # In a real CI env, we would get the diff.
    # Here we just output the template to a file that can be used.

    checklist = COMMON_CHECKLIST

    # Heuristic: Check if arguments indicate file types (simulating a git diff check)
    # For now, we will just output the full potential checklist template

    checklist += "\n<!-- If DB files changed -->\n" + DB_CHECKLIST
    checklist += "\n<!-- If Frontend files changed -->\n" + FRONTEND_CHECKLIST

    output_path = ROOT / "docs" / "security" / "PR_SECURITY_CHECKLIST.md"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w") as f:
        f.write(checklist)

    print(f"Checklist template generated at {output_path}")


if __name__ == "__main__":
    generate_checklist()
