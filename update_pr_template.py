import os

content = open(".github/pull_request_template.md").read()

insertion_point = "## Green CI Contract Checklist\n"
new_section = """
## Governance & Labels Contract

<!-- See docs/labels.md for guidance. -->

- [ ] **Labels**: Applied `lane:*`, `level:*`, and `compliance:*` labels?
- [ ] **No Secrets**: Verified no secrets in code or history?
- [ ] **Audit**: If `compliance:audit-ready`, verified audit logs are generated?

"""

if insertion_point in content:
    parts = content.split(insertion_point)
    new_content = parts[0] + new_section + insertion_point + parts[1]
    with open(".github/pull_request_template.md", "w") as f:
        f.write(new_content)
    print(".github/pull_request_template.md updated successfully.")
else:
    print("Insertion point not found.")
