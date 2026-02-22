import os
import re
import json

def fix_workflows():
    workflow_dir = ".github/workflows"
    for root, dirs, files in os.walk(workflow_dir):
        for file in files:
            if file.endswith(".yml"):
                path = os.path.join(root, file)
                with open(path, "r") as f:
                    content = f.read()

                # 1. Fix node-version to 20 if it was 18
                content = content.replace("node-version: 18", "node-version: 20")
                content = content.replace("node-version: '18'", "node-version: '20'")

                # 2. Fix pnpm version to 10.0.0 if specified as 9.x
                content = re.sub(r'version: 9\.\d+\.\d+', 'version: 10.0.0', content)

                # 3. Ensure a SINGLE "rm -rf opa" before curl
                if "curl" in content and "opa" in content:
                    # Remove all existing "rm -rf opa" lines first to avoid duplicates
                    content = re.sub(r'\s+- name: Ensure opa path is clean\n\s+run: rm -rf opa\n', '', content)
                    content = content.replace("rm -rf opa && ", "") # in case it was inline

                    # Add it back once before the curl step
                    # Try to find the curl step and prepend the cleanup step
                    lines = content.split('\n')
                    new_lines = []
                    added_opa_cleanup = False
                    for line in lines:
                        if "curl" in line and "opa" in line and not added_opa_cleanup:
                            # Indentation logic: find the indentation of the current line
                            indent = len(line) - len(line.lstrip())
                            new_lines.append(" " * (indent - 2) + "- name: Ensure opa path is clean")
                            new_lines.append(" " * (indent) + "run: rm -rf opa")
                            added_opa_cleanup = True
                        new_lines.append(line)
                    content = '\n'.join(new_lines)

                with open(path, "w") as f:
                    f.write(content)

def fix_tsconfig():
    config_path = "server/tsconfig.json"
    if os.path.exists(config_path):
        with open(config_path, "r") as f:
            config = json.load(f)

        config["compilerOptions"]["rootDir"] = ".."
        if "paths" not in config["compilerOptions"]:
            config["compilerOptions"]["paths"] = {}

        config["compilerOptions"]["paths"]["@companyos/*"] = ["../packages/*"]
        config["compilerOptions"]["paths"]["@libs/*"] = ["../libs/*"]

        if "../packages/**/*" not in config["include"]:
            config["include"].append("../packages/**/*")
        if "../libs/**/*" not in config["include"]:
            config["include"].append("../libs/**/*")

        with open(config_path, "w") as f:
            json.dump(config, f, indent=2)

def fix_evidence_index():
    index_path = "evidence/index.json"
    if os.path.exists(index_path):
        with open(index_path, "r") as f:
            index = json.load(f)

        new_items = {
            "EVD-PLATFORM-PRIMITIVES-P2-001": {
              "id": "EVD-PLATFORM-PRIMITIVES-P2-001",
              "type": "implementation",
              "files": ["PR_BODY_FIX.md"]
            },
            "EVD-CI-REMEDIATION-P2-001": {
              "id": "EVD-CI-REMEDIATION-P2-001",
              "type": "maintenance",
              "files": [".github/workflows/*.yml"]
            }
        }

        if "items" not in index:
            index["items"] = {}

        index["items"].update(new_items)

        with open(index_path, "w") as f:
            json.dump(index, f, indent=2)

def main():
    fix_workflows()
    fix_tsconfig()
    fix_evidence_index()
    print("Clean fixes applied successfully.")

if __name__ == "__main__":
    main()
