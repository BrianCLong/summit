import json
import hashlib
import os

def generate_cases(category, tasks, evidence_prefix):
    cases = []
    for i, task in enumerate(tasks):
        case_id = f"EVID:{category}:case{i+1}"
        evidence_ids = [f"{evidence_prefix}{hashlib.sha256(f'{case_id}-{j}'.encode()).hexdigest()[:8]}" for j in range(2)]
        cases.append({
            "id": case_id,
            "task": task,
            "required_evidence": evidence_ids
        })
    return cases

def generate_evidence(category, cases):
    for case in cases:
        for i, ev_id in enumerate(case["required_evidence"]):
            filename = f"GOLDEN/datasets/{category}/EVID_{category}_{ev_id.split(':')[-1]}.json"
            content = {
                "id": ev_id,
                "case": case["id"],
                "content": f"Deterministic evidence for {ev_id}",
                "metadata": {
                    "source": f"doc_{i}",
                    "confidence": 0.95
                }
            }
            with open(filename, 'w') as f:
                json.dump(content, f, indent=2)

def main():
    # GraphRAG
    graphrag_tasks = [
        "Find connection between Alpha and Beta",
        "Explain multi-hop reasoning path",
        "Resolve conflicting claims from multiple nodes",
        "Identify implicit relationships from disconnected subgraphs",
        "Analyze temporal progression of entities in graph"
    ]
    graphrag_cases = generate_cases("graphrag", graphrag_tasks, "EVID:graphrag:")

    os.makedirs("GOLDEN/datasets/graphrag", exist_ok=True)
    with open("GOLDEN/datasets/graphrag/cases.json", "w") as f:
        json.dump(graphrag_cases, f, indent=2)
    generate_evidence("graphrag", graphrag_cases)

if __name__ == "__main__":
    main()
