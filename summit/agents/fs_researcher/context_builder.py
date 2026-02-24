from __future__ import annotations
from pathlib import Path
from typing import List, Dict, Any, Optional
from .workspace import WorkspacePaths, init_workspace

class ContextBuilder:
    def __init__(self, workspace_paths: WorkspacePaths):
        self.paths = workspace_paths

    def initialize_control_files(self, query: str):
        """
        Sets up the initial state of the control files based on the query.
        """
        index_content = f"# Research Index: {query}\n\n## Status: In Progress\n"
        self.paths.root.joinpath("index.md").write_text(index_content, encoding="utf-8")

        todo_content = f"# Research Todo: {query}\n\n- [ ] Initial search for '{query}'\n"
        self.paths.root.joinpath("todo.md").write_text(todo_content, encoding="utf-8")

        log_content = f"# Research Log: {query}\n\n- Iteration 0: Initialized workspace\n"
        self.paths.root.joinpath("log.md").write_text(log_content, encoding="utf-8")

    def archive_source(self, source_id: str, content: str, url: str):
        """
        Archives raw content from a source.
        """
        filename = f"{source_id}.html"
        source_file = self.paths.sources_dir / filename
        source_file.write_text(f"URL: {url}\n\n{content}", encoding="utf-8")

        with open(self.paths.root / "log.md", "a", encoding="utf-8") as f:
            f.write(f"- Archived source {source_id} from {url}\n")

    def add_kb_note(self, title: str, content: str, source_refs: List[str]):
        """
        Adds a note to the knowledge base with citations.
        """
        note_filename = f"{title.lower().replace(' ', '_')}.md"
        note_file = self.paths.kb_dir / note_filename

        citation_str = ", ".join([f"[[{ref}]]" for ref in source_refs])
        note_content = f"# {title}\n\n{content}\n\nSources: {citation_str}\n"
        note_file.write_text(note_content, encoding="utf-8")

    def update_todo(self, completed: List[str], new_tasks: List[str]):
        """
        Updates the todo list.
        """
        todo_path = self.paths.root / "todo.md"
        lines = todo_path.read_text(encoding="utf-8").splitlines()

        new_lines = []
        for line in lines:
            if any(task in line for task in completed):
                new_lines.append(line.replace("[ ]", "[x]"))
            else:
                new_lines.append(line)

        for task in new_tasks:
            new_lines.append(f"- [ ] {task}")

        todo_path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")

    def run_iteration(self, action_summary: str):
        """
        Records an iteration in the log.
        """
        with open(self.paths.root / "log.md", "a", encoding="utf-8") as f:
            f.write(f"- Iteration: {action_summary}\n")
