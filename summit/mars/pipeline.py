class ModularPipeline:
    def __init__(self, design_spec=None):
        self.design_spec = design_spec
        self.tasks = []

    def decompose(self, spec=None):
        target_spec = spec or self.design_spec
        # Mock decomposition
        self.tasks = [
            {"id": "task_1", "type": "design", "dependencies": []},
            {"id": "task_2", "type": "implement", "dependencies": ["task_1"]},
        ]
        return {"tasks": self.tasks}

MARSPipeline = ModularPipeline
