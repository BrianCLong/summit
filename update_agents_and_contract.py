import json
import os

# Update AGENTS.md
agents_md_path = "AGENTS.md"
with open(agents_md_path, "r") as f:
    content = f.read()

target_string = "failures must be classified per `docs/ga/AGENT-FAILURE-MODES.md`."
insertion = "\n- **Context Engineering:** Agents must consume context from `.summit/context/` via the `context_report.json` mechanism. See [`docs/standards/context-engineering-coding-agents.md`](docs/standards/context-engineering-coding-agents.md) for the governed taxonomy of Guidance, Instructions, and Interfaces."

if target_string in content:
    new_content = content.replace(target_string, target_string + insertion)
    with open(agents_md_path, "w") as f:
        f.write(new_content)
    print(f"Updated {agents_md_path}")
else:
    print(f"Target string not found in {agents_md_path}")

# Update agent-contract.json
contract_path = "agent-contract.json"
try:
    with open(contract_path, "r") as f:
        contract = json.load(f)

    # Check if ContextDefinition zone exists
    exists = any(z["name"] == "ContextDefinition" for z in contract["allowedZones"])
    if not exists:
        new_zone = {
            "name": "ContextDefinition",
            "paths": [".summit/context/"],
            "notes": "Context engineering artifacts (guidance, instructions, interfaces)."
        }
        contract["allowedZones"].append(new_zone)

        with open(contract_path, "w") as f:
            json.dump(contract, f, indent=2)
        print(f"Updated {contract_path}")
    else:
        print(f"ContextDefinition zone already exists in {contract_path}")

except Exception as e:
    print(f"Error updating {contract_path}: {e}")
