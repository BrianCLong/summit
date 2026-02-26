# summit/report/generator.py
from typing import List, Dict

class ReportGenerator:
    def generate_markdown(self, bridges: List[Dict]) -> str:
        lines = [
            "# Summit Semantic Connections Report",
            "",
            "This report surfaces deterministic connections between local notes based on semantic similarity.",
            "",
            "## Top Semantic Bridges",
            ""
        ]

        for idx, b in enumerate(bridges):
            lines.append(f"### Connection {idx + 1}")
            lines.append(f"- **Source**: `{b['source_doc']}` ({b['source_evidence']})")
            lines.append(f"- **Target**: `{b['target_doc']}` ({b['target_evidence']})")
            lines.append(f"- **Similarity Score**: {b['similarity_score']}")
            lines.append(f"- **Evidence IDs**: {', '.join(b['evidence_ids'])}")
            lines.append("")

        return "\n".join(lines)
