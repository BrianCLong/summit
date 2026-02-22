from summit.mars.pipeline import ModularPipeline
from summit.mars.cost import TaskType

def test_mars_pipeline_decomposition():
    pipeline = ModularPipeline("Complex Research")
    dag = pipeline.decompose()

    tasks = dag["tasks"]
    assert len(tasks) == 4
    assert dag["pattern"] == "Design-Decompose-Implement"

    # Check task types
    task_types = [t["type"] for t in tasks]
    assert TaskType.DESIGN in task_types
    assert TaskType.DECOMPOSE in task_types
    assert TaskType.IMPLEMENT in task_types
    assert TaskType.EVALUATE in task_types

def test_mars_pipeline_dependencies():
    pipeline = ModularPipeline("Test")
    dag = pipeline.decompose()
    tasks = {t["id"]: t for t in dag["tasks"]}

    assert "T1" in tasks["T2"]["dependencies"]
    assert "T2" in tasks["T3"]["dependencies"]
    assert "T3" in tasks["T4"]["dependencies"]
