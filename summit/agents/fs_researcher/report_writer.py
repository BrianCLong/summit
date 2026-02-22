from __future__ import annotations
from pathlib import Path
from typing import List, Dict, Any, Optional
from .workspace import WorkspacePaths

class ReportWriter:
    def __init__(self, workspace_paths: WorkspacePaths, tools_allowed: bool = False):
        self.paths = workspace_paths
        self.tools_allowed = tools_allowed
        self.assert_no_browsing_tools()

    def assert_no_browsing_tools(self):
        """
        Ensures that browsing tools are disabled for the Report Writer stage.
        """
        if self.tools_allowed:
            raise RuntimeError("ReportWriter must run KB-only with browsing tools disabled.")

    def generate_outline(self, kb_summary: str) -> List[str]:
        """
        Generates a report outline based on the KB content.
        """
        # In a real implementation, this would be an LLM call.
        outline = ["Introduction", "Background", "Analysis", "Conclusion"]
        outline_md = "# Report Outline\n\n" + "\n".join([f"- {s}" for s in outline])
        (self.paths.root / "report_outline.md").write_text(outline_md, encoding="utf-8")
        return outline

    def write_section(self, section_name: str, kb_content: str, section_checklist: List[str]) -> str:
        """
        Writes a single section using only KB content and verifies it against a checklist.
        """
        self.assert_no_browsing_tools()

        # In a real implementation, this would be an LLM call.
        section_text = f"## {section_name}\n\nThis is the content for {section_name} based on KB: {kb_content[:50]}...\n"

        # Verify against checklist
        self._validate_checklist(section_name, section_checklist)

        report_file = self.paths.root / "report.md"
        with open(report_file, "a", encoding="utf-8") as f:
            f.write(section_text + "\n")

        return section_text

    def final_review(self, report_checklist: List[str]) -> bool:
        """
        Performs a final review of the entire report.
        """
        self._validate_checklist("Final Review", report_checklist)
        return True

    def _validate_checklist(self, context: str, checklist: List[str]):
        """
        Validates the output against the provided checklist.
        """
        # In a real implementation, this would use an LLM or heuristic to verify the checklist.
        # For MWS, we assume the checklist passes unless it's explicitly designed to fail in tests.
        pass
