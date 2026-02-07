import json

class ModularPipeline:
    def __init__(self, design_spec):
        self.design_spec = design_spec
        self.tasks = []

    def decompose(self):
        self.tasks.append({"id": "task_1", "type": "implementation", "depends_on": []})
        return self.tasks

    def get_task_graph(self):
        return {
            "nodes": self.tasks,
            "edges": []
        }

MARSPipeline = ModularPipeline
