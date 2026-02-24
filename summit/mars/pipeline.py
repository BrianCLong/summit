from .cost import TaskType

class ModularPipeline:
    def __init__(self, design_spec=None):
        self.design_spec = design_spec
        self.tasks = []

    def decompose(self, spec=None):
        target_spec = spec or self.design_spec
        # Implements "Design-Decompose-Implement" pattern
        self.tasks = [
            {
                "id": "T1",
                "type": TaskType.DESIGN,
                "description": f"Initial design for {target_spec}",
                "dependencies": []
            },
            {
                "id": "T2",
                "type": TaskType.DECOMPOSE,
                "description": "Decompose design into subtasks",
                "dependencies": ["T1"]
            },
            {
                "id": "T3",
                "type": TaskType.IMPLEMENT,
                "description": "Implementation of core modules",
                "dependencies": ["T2"]
            },
            {
                "id": "T4",
                "type": TaskType.EVALUATE,
                "description": "Evaluation of implementation",
                "dependencies": ["T3"]
            }
        ]
        return {
            "spec": target_spec,
            "tasks": self.tasks,
            "pattern": "Design-Decompose-Implement"
        }

MARSPipeline = ModularPipeline
