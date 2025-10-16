import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from prompt_engineering import PromptTuning  # noqa: E402
from routing import Ticket, TicketRouter, WorkerProfile  # noqa: E402


def _tuning() -> PromptTuning:
    return PromptTuning(
        system_instruction="Deliver", max_prompt_chars=1000, temperature=0.5, max_tokens=300
    )


def test_router_assigns_best_skill_match():
    workers = [
        WorkerProfile(
            identifier="worker-a",
            display_name="A",
            capabilities=frozenset({"navigation"}),
            max_concurrent=1,
        ),
        WorkerProfile(
            identifier="worker-b",
            display_name="B",
            capabilities=frozenset({"navigation", "compliance"}),
            max_concurrent=1,
        ),
    ]
    router = TicketRouter(workers=workers, default_prompt_tuning=_tuning())

    tickets = [
        Ticket(
            identifier="T1",
            summary="High priority",
            priority=5,
            required_capabilities=frozenset({"compliance"}),
            entry_url="https://example.org/context",
            prompt="Do the compliance thing",
            llm_endpoint="https://example.org/llm",
            automation_mode="auto",
        ),
        Ticket(
            identifier="T2",
            summary="Navigation only",
            priority=2,
            required_capabilities=frozenset({"navigation"}),
            entry_url="https://example.org/context",
            prompt="Navigate only",
            llm_endpoint="https://example.org/llm",
            automation_mode="guided",
        ),
    ]

    parcels = router.plan(tickets)

    assert parcels[0].worker.identifier == "worker-b"
    assert parcels[0].manual_control.mode == "auto"
    assert parcels[1].manual_control.mode == "guided"


def test_router_respects_manual_override():
    workers = [
        WorkerProfile(
            identifier="worker-a",
            display_name="A",
            capabilities=frozenset({"navigation"}),
            max_concurrent=1,
        ),
        WorkerProfile(
            identifier="worker-b",
            display_name="B",
            capabilities=frozenset({"navigation", "compliance"}),
            max_concurrent=1,
        ),
    ]
    router = TicketRouter(workers=workers, default_prompt_tuning=_tuning())
    router.register_manual_override("T1", "worker-a")

    ticket = Ticket(
        identifier="T1",
        summary="Manual assignment",
        priority=5,
        required_capabilities=frozenset({"compliance"}),
        entry_url="https://example.org/context",
        prompt="Do the compliance thing",
        llm_endpoint="https://example.org/llm",
        automation_mode="manual",
    )

    parcels = router.plan([ticket])
    assert parcels[0].worker.identifier == "worker-a"
    assert parcels[0].manual_control.pause_before_prompt is True
    assert parcels[0].prompt_tuning.temperature <= 0.5
