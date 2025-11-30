import yaml
import os
import logging
from typing import List
from .types import Task

log = logging.getLogger("summit-fara")

class CurriculumAgent:
    def __init__(self):
        self.backlog_path = "backlog.yaml"
        # Fallback if running from tools/summit-fara/
        if not os.path.exists(self.backlog_path):
            self.backlog_path = "../../backlog.yaml"

    def generate_tasks(self, count: int = 10) -> List[Task]:
        """
        Generates tasks based on repository state (backlog.yaml, pending PRs).
        """
        tasks = []

        # 1. Read Backlog
        if os.path.exists(self.backlog_path):
            try:
                with open(self.backlog_path, 'r') as f:
                    backlog_data = yaml.safe_load(f)

                # Assuming backlog structure, iterate and create tasks
                # This is a simplification based on typical yaml structure
                if isinstance(backlog_data, list):
                    for item in backlog_data:
                        if isinstance(item, dict) and 'title' in item:
                            tasks.append(Task(
                                id=str(item.get('id', len(tasks))),
                                description=f"Implement feature: {item['title']}",
                                type="feature"
                            ))
                elif isinstance(backlog_data, dict):
                     # Handle dictionary structure if backlog.yaml is keyed
                     for key, val in backlog_data.items():
                         tasks.append(Task(id=str(key), description=f"Process item: {val}", type="general"))

            except Exception as e:
                log.warning(f"Failed to read backlog.yaml: {e}")
        else:
            log.warning(f"Backlog file not found at {self.backlog_path}")

        # 2. Synthetic tasks if backlog is empty or insufficient
        synthetic_tasks = [
            "Automate YAML taxonomy ingestion PR via browser GitHub UI",
            "Check for taxonomy leaks in server/src/pii",
            "Verify SLO compliance badge generation",
            "Refactor auth middleware for consistent tenantId usage",
            "Update README.md with latest component status"
        ]

        for i, desc in enumerate(synthetic_tasks):
            tasks.append(Task(id=f"synth-{i}", description=desc, type="synthetic"))

        return tasks[:count]
