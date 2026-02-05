from summit.mars.task_graph import TaskGraph
from summit.mars.cost import TaskType

class MARSPipeline:
    def __init__(self, evidence_id: str):
        self.evidence_id = evidence_id
        self.graph = TaskGraph()

    def construct(self, design_goal: str):
        # 1. Design
        design_id = "task_0_design"
        self.graph.add_task(design_id, TaskType.DESIGN.value, {"goal": design_goal})

        # 2. Decompose
        decompose_id = "task_1_decompose"
        self.graph.add_task(decompose_id, TaskType.DECOMPOSE.value)
        self.graph.add_dependency(decompose_id, design_id)

        # 3. Implement
        implement_id = "task_2_implement"
        self.graph.add_task(implement_id, TaskType.IMPLEMENT.value)
        self.graph.add_dependency(implement_id, decompose_id)

        return self.graph

    def get_plan_artifact(self):
        return {
            "schema_version": "1.0",
            "evidence_id": self.evidence_id,
            "tasks": self.graph.to_dict()
        }
