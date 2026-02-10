import json

path = "evidence/index.json"
with open(path, "r") as f:
    data = json.load(f)

new_items = {
    "EVD-AGENTFW2026-EVAL-001": {
        "title": "AgentKit Eval Sanity",
        "category": "agentkit",
        "artifacts": ["evidence/report.json", "evidence/metrics.json"]
    },
    "EVD-AGENTFW2026-TRACE-001": {
        "title": "AgentKit Trace",
        "category": "agentkit",
        "artifacts": ["evidence/report.json"]
    },
    "EVD-AGENTFW2026-SEC-001": {
        "title": "AgentKit Security Gates",
        "category": "agentkit",
        "artifacts": ["evidence/report.json"]
    },
    "EVD-AGENTFW2026-COST-001": {
        "title": "AgentKit Cost Accounting",
        "category": "agentkit",
        "artifacts": ["evidence/metrics.json"]
    }
}

data["items"].update(new_items)

with open(path, "w") as f:
    json.dump(data, f, indent=2)
