import pathlib
import sys

import pytest

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "src"))

import main  # noqa: E402  pylint: disable=wrong-import-position
from automation import (  # noqa: E402
    AutomationOrchestrator,
    LLMWebPrompter,
    NavigationRequest,
    NavigationResult,
    PromptResult,
    WebNavigator,
    WorkProduct,
    WorkProductCapture,
)
from main import execute_ticket, plan_tickets  # noqa: E402
from prompt_engineering import PromptEngineer, PromptTuning  # noqa: E402
from routing import ManualControlPlan, Ticket, WorkerProfile, WorkParcel  # noqa: E402


class FakeHttpClient:
    def __init__(self) -> None:
        self.requests: list[NavigationRequest] = []

    def request(self, request: NavigationRequest) -> NavigationResult:
        self.requests.append(request)
        body = "page-body" if request.method.upper() == "GET" else "llm-response"
        return NavigationResult(status=200, body=body, metadata={"method": request.method})


class RecordingController:
    def __init__(self) -> None:
        self.stages: list[str] = []

    def await_confirmation(
        self, stage: str, parcel: WorkParcel
    ) -> None:  # noqa: ARG002 - interface requirement
        self.stages.append(stage)


def test_orchestrator_runs_full_cycle():
    client = FakeHttpClient()
    navigator = WebNavigator(client=client)
    prompter = LLMWebPrompter(client=client)
    capture = WorkProductCapture()
    controller = RecordingController()
    orchestrator = AutomationOrchestrator(navigator, prompter, capture, controller=controller)

    ticket = Ticket(
        identifier="T1",
        summary="Test",
        priority=3,
        required_capabilities=frozenset({"navigation"}),
        entry_url="https://example.org/context",
        prompt="Summarize findings",
        llm_endpoint="https://example.org/llm",
        automation_mode="guided",
        context={"ticket": "T1"},
    )
    worker = WorkerProfile(
        identifier="worker-a",
        display_name="A",
        capabilities=frozenset({"navigation"}),
        max_concurrent=1,
    )
    manual = ManualControlPlan(
        mode="guided",
        pause_before_navigation=False,
        pause_before_prompt=True,
        pause_before_capture=True,
    )
    tuning = PromptTuning(system_instruction="Do the work", temperature=0.2, max_tokens=256)
    parcel = WorkParcel(ticket=ticket, worker=worker, manual_control=manual, prompt_tuning=tuning)

    engineer = PromptEngineer(tuning)
    product = orchestrator.execute(parcel, engineer)

    assert product.ticket_id == "T1"
    assert product.worker_id == "worker-a"
    assert product.llm_result.response == "llm-response"
    assert controller.stages == ["prompt", "capture"]
    assert capture.get("T1") is product
    assert any(request.method.upper() == "GET" for request in client.requests)
    assert any(request.method.upper() == "POST" for request in client.requests)


def test_plan_tickets_integration():
    plan = plan_tickets.run(
        [
            {
                "id": "T1",
                "priority": 5,
                "required_capabilities": ["navigation", "compliance"],
                "entry_url": "https://example.org/context",
                "prompt": "Document findings",
                "llm_endpoint": "https://example.org/llm",
            }
        ]
    )

    assert plan[0]["ticket_id"] == "T1"
    assert plan[0]["automation_mode"] in {"auto", "guided", "manual"}


def test_execute_ticket_uses_overrides(monkeypatch: pytest.MonkeyPatch):
    stub_results: list[WorkProduct] = []

    class StubOrchestrator:
        def execute(
            self, parcel: WorkParcel, engineer: PromptEngineer
        ) -> WorkProduct:  # noqa: ARG002 - interface requirement
            result = WorkProduct(
                ticket_id=parcel.ticket.identifier,
                worker_id=parcel.worker.identifier,
                navigation=[],
                llm_result=PromptResult(prompt="", response="stub", tuning=parcel.prompt_tuning),
                manual_control=parcel.manual_control,
            )
            stub_results.append(result)
            return result

    monkeypatch.setattr(main, "_build_orchestrator", lambda: StubOrchestrator())

    result = execute_ticket.run(
        {
            "id": "T99",
            "priority": 4,
            "required_capabilities": ["navigation"],
            "entry_url": "",
            "prompt": "Do work",
            "llm_endpoint": "https://example.org/llm",
        },
        overrides={"T99": "navigator-2"},
    )

    assert result["ticket_id"] == "T99"
    assert stub_results[0].worker_id == "navigator-2"
