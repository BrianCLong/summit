import os

content = open("CONTRIBUTING.md").read()

insertion_point = "- **Documentation**: audience, coverage, link verification, and asset expectations.\n"
new_section = """
## 🏷️ Labels & Governance

We use a strict label taxonomy to route issues and trigger compliance gates.

- **[Label Playbook](docs/labels.md)**: Defines all lanes (`lane:bizdev`, `lane:engineering`), levels, and compliance flags.
- **Bot Actions**: Our bots automatically tag PRs based on file paths. Please verify these labels.
- **Skills Pack**: For React best practices, refer to our vendored [Skills Pack](skills/vendor/vercel-labs-agent-skills/skills/react-best-practices/).
"""

if insertion_point in content:
    parts = content.split(insertion_point)
    new_content = parts[0] + insertion_point + new_section + parts[1]
    with open("CONTRIBUTING.md", "w") as f:
        f.write(new_content)
    print("CONTRIBUTING.md updated successfully.")
else:
    print("Insertion point not found.")
