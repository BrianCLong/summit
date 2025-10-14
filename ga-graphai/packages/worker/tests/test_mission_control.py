import pathlib
import sys


sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from main import (  # type: ignore
    AgentProfile,
    MissionControlOrchestrator,
    MissionTask,
    TaskSpec,
    ToolCapability,
)


def echo_handler(payload):
    return {"echo": payload}


def conditional_handler(payload):
    if payload.get("fail"):
        raise RuntimeError("boom")
    return {"ok": True}


def test_priority_drives_execution_and_assignment():
    orchestrator = MissionControlOrchestrator()
    orchestrator.register_tool(ToolCapability(name="analysis", handler=echo_handler))

    orchestrator.register_agent(
        AgentProfile(name="alpha", authority=4, allowed_tools=["analysis"]),
        capabilities={"analysis"},
        max_concurrent=1,
    )
    orchestrator.register_agent(
        AgentProfile(name="bravo", authority=5, allowed_tools=["analysis"]),
        capabilities={"analysis", "ops"},
        max_concurrent=1,
    )

    tasks = [
        MissionTask(
            TaskSpec(task_id="t1", tool="analysis", payload={"value": 1}),
            priority=2,
        ),
        MissionTask(
            TaskSpec(task_id="t2", tool="analysis", payload={"value": 2}),
            priority=5,
            required_capabilities=frozenset({"ops"}),
        ),
        MissionTask(
            TaskSpec(task_id="t3", tool="analysis", payload={"value": 3}),
            priority=3,
            dependencies=frozenset({"t1"}),
        ),
    ]

    report = orchestrator.dispatch("order-1", "director", tasks)

    assert [result.task_id for result in report.results] == ["t2", "t1", "t3"]
    assert all(result.status == "success" for result in report.results)
    provenance_map = {entry["task_id"]: entry["agent"] for entry in report.provenance}
    assert provenance_map["t2"] == "bravo"


def test_failed_dependency_blocks_downstream():
    orchestrator = MissionControlOrchestrator()
    orchestrator.register_tool(ToolCapability(name="analysis", handler=conditional_handler))
    orchestrator.register_agent(
        AgentProfile(name="alpha", authority=5, allowed_tools=["analysis"]),
        capabilities={"analysis"},
    )

    tasks = [
        MissionTask(
            TaskSpec(task_id="t1", tool="analysis", payload={"fail": True})
        ),
        MissionTask(
            TaskSpec(task_id="t2", tool="analysis", payload={}),
            dependencies=frozenset({"t1"}),
        ),
    ]

    report = orchestrator.dispatch("order-2", "director", tasks)

    status = {result.task_id: result.status for result in report.results}
    assert status["t1"] == "failed"
    assert status["t2"] == "blocked"
    assert "t1" in report.results[1].logs[0]


def test_blocks_when_no_eligible_agent_available():
    orchestrator = MissionControlOrchestrator()
    orchestrator.register_tool(ToolCapability(name="analysis", handler=echo_handler))
    orchestrator.register_agent(
        AgentProfile(name="alpha", authority=1, allowed_tools=["analysis"]),
        capabilities={"analysis"},
    )

    tasks = [
        MissionTask(
            TaskSpec(
                task_id="t1",
                tool="analysis",
                payload={},
                required_authority=3,
            ),
            priority=4,
        )
    ]

    report = orchestrator.dispatch("order-3", "director", tasks)

    assert report.results[0].status == "blocked"
    assert "no eligible agent" in report.results[0].logs[0]
