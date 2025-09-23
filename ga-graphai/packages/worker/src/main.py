from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Dict, Iterable, List, Optional


def ping() -> str:
    return "pong"


@dataclass(frozen=True)
class ToolCapability:
    name: str
    handler: Callable[[Dict[str, Any]], Dict[str, Any]]
    minimum_authority: int = 0


@dataclass
class AgentProfile:
    name: str
    authority: int
    allowed_tools: List[str] = field(default_factory=list)


@dataclass
class TaskSpec:
    task_id: str
    tool: str
    payload: Dict[str, Any]
    required_authority: Optional[int] = None
    action: str = "execute"
    resource: str = ""


@dataclass
class TaskResult:
    task_id: str
    status: str
    output: Dict[str, Any]
    logs: List[str]


@dataclass
class ExecutionReport:
    order_id: str
    submitted_by: str
    started_at: datetime
    finished_at: datetime
    results: List[TaskResult]
    provenance: List[Dict[str, Any]]


class PolicyViolation(Exception):
    pass


class WorkcellOrchestrator:
    """Coordinates agent work while enforcing basic guardrails."""

    def __init__(self) -> None:
        self._tools: Dict[str, ToolCapability] = {}
        self._agents: Dict[str, AgentProfile] = {}
        self._policy_hooks: List[Callable[[TaskSpec, AgentProfile], Iterable[str]]] = []
        self._provenance_log: List[Dict[str, Any]] = []

    def register_tool(self, tool: ToolCapability) -> None:
        self._tools[tool.name] = tool

    def register_agent(self, agent: AgentProfile) -> None:
        self._agents[agent.name] = agent

    def register_policy_hook(
        self, hook: Callable[[TaskSpec, AgentProfile], Iterable[str]]
    ) -> None:
        self._policy_hooks.append(hook)

    def submit(
        self,
        order_id: str,
        submitted_by: str,
        agent_name: str,
        tasks: List[TaskSpec]
    ) -> ExecutionReport:
        if agent_name not in self._agents:
            raise PolicyViolation(f"unknown agent {agent_name}")

        agent = self._agents[agent_name]
        started_at = datetime.now(timezone.utc)
        results: List[TaskResult] = []

        for task in tasks:
            result = self._execute_task(task, agent)
            results.append(result)

        finished_at = datetime.now(timezone.utc)
        return ExecutionReport(
            order_id=order_id,
            submitted_by=submitted_by,
            started_at=started_at,
            finished_at=finished_at,
            results=results,
            provenance=list(self._provenance_log)
        )

    def _execute_task(self, task: TaskSpec, agent: AgentProfile) -> TaskResult:
        logs: List[str] = []
        tool = self._tools.get(task.tool)
        if tool is None:
            message = f"tool {task.tool} is not registered"
            logs.append(message)
            self._provenance_log.append(
                self._build_provenance(task, agent, "rejected", reason=message)
            )
            return TaskResult(task.task_id, "rejected", {}, logs)

        required_authority = task.required_authority or tool.minimum_authority
        if agent.authority < required_authority:
            message = f"agent {agent.name} lacks authority for {task.tool}"
            logs.append(message)
            self._provenance_log.append(
                self._build_provenance(task, agent, "rejected", reason=message)
            )
            return TaskResult(task.task_id, "rejected", {}, logs)

        if task.tool not in agent.allowed_tools:
            message = f"agent {agent.name} is not permitted to use {task.tool}"
            logs.append(message)
            self._provenance_log.append(
                self._build_provenance(task, agent, "rejected", reason=message)
            )
            return TaskResult(task.task_id, "rejected", {}, logs)

        policy_messages: List[str] = []
        for hook in self._policy_hooks:
            violations = list(hook(task, agent))
            if violations:
                policy_messages.extend(violations)

        if policy_messages:
            logs.extend(policy_messages)
            reason = "; ".join(policy_messages)
            self._provenance_log.append(
                self._build_provenance(task, agent, "rejected", reason=reason)
            )
            return TaskResult(task.task_id, "rejected", {}, logs)

        try:
            output = tool.handler(task.payload)
            self._provenance_log.append(
                self._build_provenance(task, agent, "success", details=output)
            )
            return TaskResult(task.task_id, "success", output, logs)
        except Exception as exc:  # pragma: no cover - safety net
            message = f"execution failure: {exc}"
            logs.append(message)
            self._provenance_log.append(
                self._build_provenance(task, agent, "failed", reason=str(exc))
            )
            return TaskResult(task.task_id, "failed", {}, logs)

    def _build_provenance(
        self,
        task: TaskSpec,
        agent: AgentProfile,
        status: str,
        *,
        reason: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        record: Dict[str, Any] = {
            "task_id": task.task_id,
            "tool": task.tool,
            "status": status,
            "agent": agent.name,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        if reason:
            record["reason"] = reason
        if details:
            record["details"] = details
        return record

    @property
    def provenance(self) -> List[Dict[str, Any]]:
        return list(self._provenance_log)
