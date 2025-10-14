from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Dict, Iterable, List, Mapping, Optional, Sequence, Set

from automation import (
    AutomationOrchestrator,
    LLMWebPrompter,
    WebNavigator,
    WorkProductCapture,
)
from prompt_engineering import PromptEngineer, PromptTuning
from routing import Ticket, TicketRouter, WorkerProfile


def ping() -> str:
    return "pong"


class Command:
    """Simple callable wrapper providing a ``run`` method for orchestration commands."""

    def __init__(self, func: Callable[..., Any]) -> None:
        self._func = func

    def run(self, *args: Any, **kwargs: Any) -> Any:
        return self._func(*args, **kwargs)


_DEFAULT_WORKERS: Sequence[WorkerProfile] = (
    WorkerProfile(
        identifier="navigator-1",
        display_name="Navigator One",
        capabilities=frozenset({"navigation"}),
        max_concurrent=2,
    ),
    WorkerProfile(
        identifier="navigator-2",
        display_name="Navigator Two",
        capabilities=frozenset({"navigation", "compliance"}),
        max_concurrent=1,
    ),
    WorkerProfile(
        identifier="analyst-1",
        display_name="Analyst One",
        capabilities=frozenset({"analysis", "compliance"}),
        max_concurrent=1,
    ),
)

_DEFAULT_PROMPT_TUNING = PromptTuning(
    system_instruction=(
        "You are the Summit automation co-pilot. Produce clear, policy-compliant"
        " findings for every ticket."
    ),
    style_guide=("Summaries should be concise", "Highlight next actions when possible"),
    safety_clauses=(
        "Do not disclose restricted data.",
        "Escalate if compliance guidance is unclear.",
    ),
    max_prompt_chars=4000,
    temperature=0.3,
    max_tokens=512,
)


def _build_router() -> TicketRouter:
    return TicketRouter(_DEFAULT_WORKERS, _DEFAULT_PROMPT_TUNING)


def _build_orchestrator() -> AutomationOrchestrator:
    return AutomationOrchestrator(WebNavigator(), LLMWebPrompter(), WorkProductCapture())


def _normalise_ticket(ticket: Mapping[str, Any]) -> Ticket:
    summary = ticket.get("summary") or ticket.get("prompt") or ticket["id"]
    capabilities = frozenset(ticket.get("required_capabilities", []))
    context_mapping = ticket.get("context") or {}
    return Ticket(
        identifier=ticket["id"],
        summary=summary,
        priority=int(ticket.get("priority", 3)),
        required_capabilities=capabilities,
        entry_url=ticket.get("entry_url", ""),
        prompt=ticket["prompt"],
        llm_endpoint=ticket["llm_endpoint"],
        automation_mode=ticket.get("automation_mode", "auto"),
        context=dict(context_mapping),
    )


def _plan_ticket_payloads(tickets: Sequence[Mapping[str, Any]]) -> list[dict[str, Any]]:
    router = _build_router()
    parcels = router.plan(_normalise_ticket(ticket) for ticket in tickets)
    plan: list[dict[str, Any]] = []
    for parcel in parcels:
        plan.append(
            {
                "ticket_id": parcel.ticket.identifier,
                "worker_id": parcel.worker.identifier,
                "worker_name": parcel.worker.display_name,
                "automation_mode": parcel.manual_control.mode,
                "prompt_tuning": {
                    "system_instruction": parcel.prompt_tuning.system_instruction,
                    "temperature": parcel.prompt_tuning.temperature,
                    "max_tokens": parcel.prompt_tuning.max_tokens,
                },
            }
        )
    return plan


def _execute_ticket_payload(
    ticket: Mapping[str, Any],
    *,
    overrides: Mapping[str, str] | None = None,
) -> dict[str, Any]:
    router = _build_router()
    if overrides:
        for ticket_id, worker_id in overrides.items():
            router.register_manual_override(ticket_id, worker_id)

    parcels = router.plan([_normalise_ticket(ticket)])
    if not parcels:
        raise RuntimeError(f"No eligible worker available for ticket {ticket.get('id')}")

    parcel = parcels[0]
    orchestrator = _build_orchestrator()
    engineer = PromptEngineer(parcel.prompt_tuning)
    product = orchestrator.execute(parcel, engineer)
    return product.to_dict()


plan_tickets = Command(_plan_ticket_payloads)
execute_ticket = Command(_execute_ticket_payload)


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

    def execute_task_for_agent(self, agent_name: str, task: TaskSpec) -> TaskResult:
        """Execute a single task on behalf of ``agent_name``.

        This helper exposes the scheduler-friendly primitive that powers
        :meth:`submit`, enabling higher-order orchestrators to dynamically
        route work without reimplementing guardrails or provenance capture.
        """

        if agent_name not in self._agents:
            raise PolicyViolation(f"unknown agent {agent_name}")
        agent = self._agents[agent_name]
        return self._execute_task(task, agent)

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


@dataclass(frozen=True)
class MissionTask:
    """Rich task description that includes priority and dependency metadata."""

    spec: TaskSpec
    priority: int = 3
    dependencies: frozenset[str] = frozenset()
    required_capabilities: frozenset[str] = frozenset()

    def __post_init__(self) -> None:
        if self.spec.task_id in self.dependencies:
            raise ValueError("task cannot depend on itself")


@dataclass
class _MissionAgentState:
    profile: AgentProfile
    capabilities: frozenset[str]
    max_concurrent: int
    current_load: int = 0

    def can_accept(self, task: MissionTask) -> bool:
        if self.current_load >= self.max_concurrent:
            return False
        required_authority = task.spec.required_authority or 0
        if self.profile.authority < required_authority:
            return False
        if task.spec.tool not in self.profile.allowed_tools:
            return False
        if task.required_capabilities and not task.required_capabilities.issubset(
            self.capabilities
        ):
            return False
        return True


class _DependencyTracker:
    def __init__(self, tasks: Sequence[MissionTask]) -> None:
        self._tasks: Dict[str, MissionTask] = {
            task.spec.task_id: task for task in tasks
        }
        self._graph: Dict[str, frozenset[str]] = {}
        for task in tasks:
            missing = task.dependencies - self._tasks.keys()
            if missing:
                missing_list = ", ".join(sorted(missing))
                raise ValueError(
                    f"task {task.spec.task_id} references unknown dependencies: {missing_list}"
                )
            self._graph[task.spec.task_id] = task.dependencies
        self._ensure_acyclic()

    def ready(self, completed: Set[str]) -> List[str]:
        ready_ids: List[str] = []
        for task_id, dependencies in self._graph.items():
            if dependencies.issubset(completed):
                ready_ids.append(task_id)
        return ready_ids

    def missing_dependencies(self, task_id: str, completed: Set[str]) -> List[str]:
        dependencies = self._graph.get(task_id, frozenset())
        return [dep for dep in dependencies if dep not in completed]

    def _ensure_acyclic(self) -> None:
        visited: Set[str] = set()
        stack: Set[str] = set()

        def visit(node: str) -> None:
            if node in stack:
                raise ValueError("dependency cycle detected")
            if node in visited:
                return
            stack.add(node)
            for dep in self._graph.get(node, frozenset()):
                visit(dep)
            stack.remove(node)
            visited.add(node)

        for node in self._graph:
            visit(node)


class MissionControlOrchestrator:
    """Priority-aware orchestration with dynamic allocation and live dependencies."""

    def __init__(self, base: WorkcellOrchestrator | None = None) -> None:
        self._base = base or WorkcellOrchestrator()
        self._agents: Dict[str, _MissionAgentState] = {}

    def register_tool(self, tool: ToolCapability) -> None:
        self._base.register_tool(tool)

    def register_policy_hook(
        self, hook: Callable[[TaskSpec, AgentProfile], Iterable[str]]
    ) -> None:
        self._base.register_policy_hook(hook)

    def register_agent(
        self,
        agent: AgentProfile,
        *,
        capabilities: Iterable[str] | None = None,
        max_concurrent: int = 1,
    ) -> None:
        self._base.register_agent(agent)
        caps = frozenset(capabilities or agent.allowed_tools)
        self._agents[agent.name] = _MissionAgentState(
            profile=agent,
            capabilities=caps,
            max_concurrent=max(1, max_concurrent),
        )

    def dispatch(
        self,
        order_id: str,
        submitted_by: str,
        tasks: Sequence[MissionTask],
    ) -> ExecutionReport:
        if not tasks:
            started_at = datetime.now(timezone.utc)
            return ExecutionReport(
                order_id=order_id,
                submitted_by=submitted_by,
                started_at=started_at,
                finished_at=started_at,
                results=[],
                provenance=[],
            )

        tracker = _DependencyTracker(tasks)
        pending: Dict[str, MissionTask] = {
            task.spec.task_id: task for task in tasks
        }
        successful: Set[str] = set()
        status_by_id: Dict[str, str] = {}
        results: List[TaskResult] = []
        extra_provenance: List[Dict[str, Any]] = []
        started_at = datetime.now(timezone.utc)
        baseline = len(self._base.provenance)

        while pending:
            ready_ids = [
                task_id
                for task_id in tracker.ready(successful)
                if task_id in pending
            ]
            ready_tasks = sorted(
                (pending[task_id] for task_id in ready_ids),
                key=lambda task: (-task.priority, task.spec.task_id),
            )

            if not ready_tasks:
                break

            assigned = False
            for task in ready_tasks:
                agent = self._select_agent(task)
                if agent is None:
                    continue
                agent.current_load += 1
                result = self._base.execute_task_for_agent(
                    agent.profile.name, task.spec
                )
                agent.current_load -= 1
                results.append(result)
                status_by_id[result.task_id] = result.status
                if result.status == "success":
                    successful.add(result.task_id)
                pending.pop(result.task_id, None)
                assigned = True
                break

            if assigned:
                continue

            for task in ready_tasks:
                message = self._build_unassigned_message(task)
                status_by_id[task.spec.task_id] = "blocked"
                results.append(
                    TaskResult(
                        task_id=task.spec.task_id,
                        status="blocked",
                        output={},
                        logs=[message],
                    )
                )
                extra_provenance.append(
                    {
                        "task_id": task.spec.task_id,
                        "tool": task.spec.tool,
                        "status": "blocked",
                        "agent": "unassigned",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "reason": message,
                    }
                )
                pending.pop(task.spec.task_id, None)

        if pending:
            for task in sorted(
                pending.values(), key=lambda task: (-task.priority, task.spec.task_id)
            ):
                blockers = tracker.missing_dependencies(task.spec.task_id, successful)
                details = ", ".join(
                    f"{dep} ({status_by_id.get(dep, 'unknown')})" for dep in blockers
                )
                reason = (
                    f"unresolved dependencies: {details}"
                    if details
                    else "blocked by upstream dependency"
                )
                status_by_id[task.spec.task_id] = "blocked"
                results.append(
                    TaskResult(
                        task_id=task.spec.task_id,
                        status="blocked",
                        output={},
                        logs=[reason],
                    )
                )
                extra_provenance.append(
                    {
                        "task_id": task.spec.task_id,
                        "tool": task.spec.tool,
                        "status": "blocked",
                        "agent": "unassigned",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "reason": reason,
                    }
                )

        finished_at = datetime.now(timezone.utc)
        provenance = self._base.provenance[baseline:]
        provenance.extend(extra_provenance)
        return ExecutionReport(
            order_id=order_id,
            submitted_by=submitted_by,
            started_at=started_at,
            finished_at=finished_at,
            results=results,
            provenance=provenance,
        )

    def _select_agent(self, task: MissionTask) -> _MissionAgentState | None:
        eligible = [
            agent
            for agent in self._agents.values()
            if agent.can_accept(task)
        ]
        if not eligible:
            return None
        return min(
            eligible,
            key=lambda agent: (
                agent.current_load,
                -agent.profile.authority,
                agent.profile.name,
            ),
        )

    def _build_unassigned_message(self, task: MissionTask) -> str:
        parts: List[str] = [f"tool {task.spec.tool}"]
        if task.spec.required_authority:
            parts.append(f"authority >= {task.spec.required_authority}")
        if task.required_capabilities:
            caps = ", ".join(sorted(task.required_capabilities))
            parts.append(f"capabilities {{{caps}}}")
        return "no eligible agent available (" + "; ".join(parts) + ")"
