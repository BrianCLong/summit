#!/usr/bin/env python3
"""
Automated Data Flow Diagram Generator
Parses the codebase to generate a Mermaid JS Data Flow Diagram.
"""

import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
SERVER_SRC = ROOT / "server" / "src"


def generate_dfd():
    print("Generating Data Flow Diagram...")

    nodes = set()
    flows = []

    # Heuristic: Find controllers calling Services/Repositories
    # We look for patterns like `Service.method()` or `Repo.method()`

    for root, _, files in os.walk(SERVER_SRC):
        for file in files:
            if file.endswith(".ts") or file.endswith(".js"):
                component_name = file.replace(".ts", "").replace(".js", "")
                file_path = os.path.join(root, file)

                try:
                    with open(file_path, encoding="utf-8") as f:
                        content = f.read()

                        # Identify dependencies based on imports
                        import_pattern = re.compile(r"import\s+.*from\s+['\"](.*)['\"]")
                        imports = import_pattern.findall(content)

                        for imp in imports:
                            if (
                                "service" in imp.lower()
                                or "repo" in imp.lower()
                                or "model" in imp.lower()
                            ):
                                target = os.path.basename(imp)
                                flows.append((component_name, target, "calls"))
                                nodes.add(component_name)
                                nodes.add(target)

                except:
                    pass

    # Generate Mermaid
    mermaid = "graph TD\n"
    for node in nodes:
        # Style nodes based on type
        if "controller" in node.lower() or "route" in node.lower():
            mermaid += f"    {node}[{node}]\n"
        elif "service" in node.lower():
            mermaid += f"    {node}({node})\n"
        elif "repo" in node.lower() or "db" in node.lower():
            mermaid += f"    {node}[({node})]\n"
        else:
            mermaid += f"    {node}[{node}]\n"

    for source, target, label in flows:
        # Cleanup names
        s = source.replace("-", "_").replace(".", "_")
        t = target.replace("-", "_").replace(".", "_")
        if s != t:
            mermaid += f"    {s} --> {t}\n"

    output_path = ROOT / "docs" / "security" / "DATA_FLOW_DIAGRAM.md"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w") as f:
        f.write("# Automated Data Flow Diagram\n\n")
        f.write("```mermaid\n")
        f.write(mermaid)
        f.write("```\n")

    print(f"DFD generated at {output_path}")


if __name__ == "__main__":
    generate_dfd()
