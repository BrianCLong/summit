import pathlib
import sys
from collections.abc import Iterable

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from main import (  # type: ignore
    AgentProfile,
    TaskSpec,
    ToolCapability,
    WorkcellOrchestrator,
)


def allow_all_policy(task: TaskSpec, agent: AgentProfile) -> Iterable[str]:
    return []


def deny_high_risk(task: TaskSpec, agent: AgentProfile) -> Iterable[str]:
    if task.payload.get("risk") == "high":
        return [f"task {task.task_id} flagged as high risk"]
    return []


def sample_handler(payload):
    return {"echo": payload}


def test_successful_execution():
    orchestrator = WorkcellOrchestrator()
    orchestrator.register_tool(
        ToolCapability(name="codegen", handler=sample_handler, minimum_authority=2)
    )
    orchestrator.register_agent(
        AgentProfile(name="agent-a", authority=3, allowed_tools=["codegen"])
    )
    orchestrator.register_policy_hook(allow_all_policy)

    report = orchestrator.submit(
        order_id="order-1",
        submitted_by="architect",
        agent_name="agent-a",
        tasks=[TaskSpec(task_id="t1", tool="codegen", payload={"intent": "build"})],
    )

    assert len(report.results) == 1
    assert report.results[0].status == "success"
    assert report.provenance[0]["status"] == "success"


def test_rejects_insufficient_authority():
    orchestrator = WorkcellOrchestrator()
    orchestrator.register_tool(
        ToolCapability(name="deploy", handler=sample_handler, minimum_authority=5)
    )
    orchestrator.register_agent(AgentProfile(name="agent-b", authority=2, allowed_tools=["deploy"]))

    report = orchestrator.submit(
        order_id="order-2",
        submitted_by="sre",
        agent_name="agent-b",
        tasks=[TaskSpec(task_id="t1", tool="deploy", payload={"version": "1.0.0"})],
    )

    assert report.results[0].status == "rejected"
    assert "lacks authority" in report.results[0].logs[0]


def test_policy_hook_blocks_task():
    orchestrator = WorkcellOrchestrator()
    orchestrator.register_tool(ToolCapability(name="analysis", handler=sample_handler))
    orchestrator.register_agent(
        AgentProfile(name="agent-c", authority=4, allowed_tools=["analysis"])
    )
    orchestrator.register_policy_hook(deny_high_risk)

    report = orchestrator.submit(
        order_id="order-3",
        submitted_by="security",
        agent_name="agent-c",
        tasks=[TaskSpec(task_id="t1", tool="analysis", payload={"risk": "high"})],
    )

    assert report.results[0].status == "rejected"
    assert "high risk" in report.results[0].logs[0]
