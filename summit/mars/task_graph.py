from typing import List, Dict, Any, Set

class TaskGraph:
    def __init__(self):
        self.nodes: Dict[str, Dict[str, Any]] = {}
        self.edges: List[tuple[str, str]] = []

    def add_task(self, task_id: str, task_type: str, metadata: Dict[str, Any] = None):
        self.nodes[task_id] = {
            "task_id": task_id,
            "type": task_type,
            "metadata": metadata or {},
            "dependencies": []
        }

    def add_dependency(self, task_id: str, depends_on: str):
        if task_id in self.nodes and depends_on in self.nodes:
            self.nodes[task_id]["dependencies"].append(depends_on)
            self.edges.append((depends_on, task_id))

    def to_dict(self) -> List[Dict[str, Any]]:
        # Return tasks in a stable order
        return [self.nodes[tid] for tid in sorted(self.nodes.keys())]

    def validate(self) -> bool:
        # Simple cycle detection
        visited = set()
        path = set()

        def has_cycle(v):
            visited.add(v)
            path.add(v)
            for neighbor in self.nodes[v]["dependencies"]:
                if neighbor not in visited:
                    if has_cycle(neighbor):
                        return True
                elif neighbor in path:
                    return True
            path.remove(v)
            return False

        for node in self.nodes:
            if node not in visited:
                if has_cycle(node):
                    return False
        return True
