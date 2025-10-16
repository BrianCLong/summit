"""Assignment engine for distributing tickets across worker pools."""

from __future__ import annotations

"""Assignment engine for distributing tickets across worker pools."""

from collections.abc import Iterable, Sequence
from dataclasses import dataclass, field

from prompt_engineering import PromptTuning


@dataclass(slots=True)
class Ticket:
    """Represents a unit of work that should be executed."""

    identifier: str
    summary: str
    priority: int
    required_capabilities: frozenset[str]
    entry_url: str
    prompt: str
    llm_endpoint: str
    automation_mode: str = "auto"
    context: dict[str, str] = field(default_factory=dict)


@dataclass(slots=True)
class WorkerProfile:
    """Describes the abilities of a worker that can execute tickets."""

    identifier: str
    display_name: str
    capabilities: frozenset[str]
    max_concurrent: int
    current_load: int = 0

    def clone(self) -> WorkerProfile:
        return WorkerProfile(
            identifier=self.identifier,
            display_name=self.display_name,
            capabilities=frozenset(self.capabilities),
            max_concurrent=self.max_concurrent,
            current_load=self.current_load,
        )


@dataclass(frozen=True, slots=True)
class ManualControlPlan:
    """Defines when human confirmation is required during execution."""

    mode: str
    pause_before_navigation: bool
    pause_before_prompt: bool
    pause_before_capture: bool


@dataclass(slots=True)
class WorkParcel:
    """A ticket that has been paired with a specific worker."""

    ticket: Ticket
    worker: WorkerProfile
    manual_control: ManualControlPlan
    prompt_tuning: PromptTuning


class TicketRouter:
    """Responsible for distributing tickets across the worker pool."""

    def __init__(
        self,
        workers: Sequence[WorkerProfile],
        default_prompt_tuning: PromptTuning,
    ) -> None:
        if not workers:
            raise ValueError("At least one worker profile is required")
        self._workers = [worker.clone() for worker in workers]
        self._default_prompt_tuning = default_prompt_tuning
        self._manual_overrides: dict[str, str] = {}

    def register_manual_override(self, ticket_id: str, worker_id: str) -> None:
        self._manual_overrides[ticket_id] = worker_id

    def clear_overrides(self) -> None:
        self._manual_overrides.clear()

    def plan(self, tickets: Iterable[Ticket]) -> list[WorkParcel]:
        parcels: list[WorkParcel] = []
        ordered_tickets = sorted(tickets, key=lambda ticket: (-ticket.priority, ticket.identifier))
        for ticket in ordered_tickets:
            worker = self._select_worker(ticket)
            if worker is None:
                continue
            tuning = self._derive_tuning(ticket)
            parcel = WorkParcel(
                ticket=ticket,
                worker=worker,
                manual_control=self._manual_plan(ticket.automation_mode),
                prompt_tuning=tuning,
            )
            parcels.append(parcel)
        return parcels

    def _select_worker(self, ticket: Ticket) -> WorkerProfile | None:
        override = self._manual_overrides.get(ticket.identifier)
        eligible_workers = [
            worker for worker in self._workers if worker.current_load < worker.max_concurrent
        ]
        if not eligible_workers:
            return None

        if override:
            worker = next(
                (worker for worker in eligible_workers if worker.identifier == override), None
            )
            if worker:
                worker.current_load += 1
                return worker

        ranked = sorted(
            eligible_workers,
            key=lambda worker: (
                self._match_score(ticket.required_capabilities, worker.capabilities),
                worker.max_concurrent - worker.current_load,
            ),
            reverse=True,
        )
        selected = ranked[0]
        selected.current_load += 1
        return selected

    def _match_score(self, required: frozenset[str], capabilities: frozenset[str]) -> int:
        return sum(1 for capability in required if capability in capabilities)

    def _manual_plan(self, mode: str) -> ManualControlPlan:
        if mode == "manual":
            return ManualControlPlan(
                mode="manual",
                pause_before_navigation=True,
                pause_before_prompt=True,
                pause_before_capture=True,
            )
        if mode == "guided":
            return ManualControlPlan(
                mode="guided",
                pause_before_navigation=False,
                pause_before_prompt=True,
                pause_before_capture=True,
            )
        return ManualControlPlan(
            mode="auto",
            pause_before_navigation=False,
            pause_before_prompt=False,
            pause_before_capture=False,
        )

    def _derive_tuning(self, ticket: Ticket) -> PromptTuning:
        if ticket.priority >= 4:
            return PromptTuning(
                system_instruction=self._default_prompt_tuning.system_instruction,
                style_guide=self._default_prompt_tuning.style_guide,
                safety_clauses=self._default_prompt_tuning.safety_clauses,
                max_prompt_chars=self._default_prompt_tuning.max_prompt_chars,
                temperature=min(0.2, self._default_prompt_tuning.temperature),
                max_tokens=self._default_prompt_tuning.max_tokens,
            )
        return self._default_prompt_tuning
