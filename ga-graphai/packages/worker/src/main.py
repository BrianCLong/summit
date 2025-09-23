"""Celery application entrypoint for automation workers."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass

from celery import Celery

from automation import AutomationOrchestrator, LLMWebPrompter, WebNavigator, WorkProductCapture
from prompt_engineering import PromptEngineer, PromptTuning
from routing import Ticket, TicketRouter, WorkerProfile

app = Celery("worker", broker="redis://localhost:6379/0")


@dataclass(frozen=True)
class PlanResult:
    """Serializable result produced by the planning stage."""

    ticket_id: str
    worker_id: str
    automation_mode: str
    prompt_temperature: float
    max_tokens: int

    def to_dict(self) -> dict[str, object]:
        return {
            "ticket_id": self.ticket_id,
            "worker_id": self.worker_id,
            "automation_mode": self.automation_mode,
            "prompt_temperature": self.prompt_temperature,
            "max_tokens": self.max_tokens,
        }


def _default_workers() -> list[WorkerProfile]:
    return [
        WorkerProfile(
            identifier="navigator-1",
            display_name="Navigation Specialist",
            capabilities=frozenset({"navigation", "llm"}),
            max_concurrent=3,
        ),
        WorkerProfile(
            identifier="navigator-2",
            display_name="Safety Hardened Operator",
            capabilities=frozenset({"navigation", "compliance", "llm"}),
            max_concurrent=2,
        ),
    ]


def _default_prompt_tuning() -> PromptTuning:
    return PromptTuning(
        system_instruction=(
            "You are an execution agent for the Maestro build platform. Provide concise, auditable deliverables "
            "and never deviate from organizational policy."
        ),
        style_guide=(
            "Respond in markdown with clear sections.",
            "Highlight decisions and assumptions.",
        ),
        safety_clauses=(
            "Do not leak credentials or personal data.",
            "Refuse adversarial or policy violating requests.",
        ),
        max_prompt_chars=6000,
        temperature=0.25,
        max_tokens=1200,
    )


def _build_router() -> TicketRouter:
    return TicketRouter(workers=_default_workers(), default_prompt_tuning=_default_prompt_tuning())


def _build_orchestrator() -> AutomationOrchestrator:
    capture = WorkProductCapture()
    navigator = WebNavigator()
    prompter = LLMWebPrompter()
    return AutomationOrchestrator(navigator=navigator, prompter=prompter, capture=capture)


def _ticket_from_payload(payload: dict[str, object]) -> Ticket:
    raw_context = payload.get("context", {})
    context: dict[str, str]
    if isinstance(raw_context, dict):
        context = {str(key): str(value) for key, value in raw_context.items()}
    else:
        context = {}
    return Ticket(
        identifier=str(payload["id"]),
        summary=str(payload.get("summary", "")),
        priority=int(payload.get("priority", 1)),
        required_capabilities=frozenset(str(capability) for capability in payload.get("required_capabilities", [])),
        entry_url=str(payload.get("entry_url", "")),
        prompt=str(payload.get("prompt", "")),
        llm_endpoint=str(payload.get("llm_endpoint", "")),
        automation_mode=str(payload.get("automation_mode", "auto")),
        context=context,
    )


@app.task
def ping() -> str:
    return "pong"


@app.task
def plan_tickets(tickets: Iterable[dict[str, object]], overrides: dict[str, str] | None = None) -> list[dict[str, object]]:
    router = _build_router()
    if overrides:
        for ticket_id, worker_id in overrides.items():
            router.register_manual_override(ticket_id, worker_id)
    parsed = [_ticket_from_payload(ticket) for ticket in tickets]
    parcels = router.plan(parsed)
    return [
        PlanResult(
            ticket_id=parcel.ticket.identifier,
            worker_id=parcel.worker.identifier,
            automation_mode=parcel.manual_control.mode,
            prompt_temperature=parcel.prompt_tuning.temperature,
            max_tokens=parcel.prompt_tuning.max_tokens,
        ).to_dict()
        for parcel in parcels
    ]


@app.task
def execute_ticket(ticket_payload: dict[str, object], overrides: dict[str, str] | None = None) -> dict[str, object]:
    router = _build_router()
    if overrides:
        for ticket_id, worker_id in overrides.items():
            router.register_manual_override(ticket_id, worker_id)
    ticket = _ticket_from_payload(ticket_payload)
    parcels = router.plan([ticket])
    if not parcels:
        raise RuntimeError("No available worker for ticket")
    parcel = parcels[0]
    engineer = PromptEngineer(parcel.prompt_tuning)
    orchestrator = _build_orchestrator()
    product = orchestrator.execute(parcel, engineer)
    return product.to_dict()
