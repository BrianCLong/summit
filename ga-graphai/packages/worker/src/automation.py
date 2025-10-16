"""Automation orchestration for navigating URLs and prompting web-based LLMs."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from typing import Any, Protocol
from urllib import request as urllib_request
from urllib.error import URLError
from urllib.parse import urlencode

from prompt_engineering import PromptEngineer, PromptTuning
from routing import ManualControlPlan, WorkParcel


@dataclass(slots=True)
class NavigationRequest:
    """Describe a navigation action to collect context before prompting."""

    url: str
    method: str = "GET"
    payload: Mapping[str, Any] | None = None
    headers: Mapping[str, str] | None = None
    timeout: float = 10.0


@dataclass(frozen=True, slots=True)
class NavigationResult:
    """Outcome of a navigation request."""

    status: int
    body: str
    metadata: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class PromptResult:
    """Captured response from the LLM web endpoint."""

    prompt: str
    response: str
    tuning: PromptTuning


@dataclass(slots=True)
class WorkProduct:
    """Artifact produced by a completed automation run."""

    ticket_id: str
    worker_id: str
    navigation: list[NavigationResult]
    llm_result: PromptResult
    manual_control: ManualControlPlan

    def to_dict(self) -> dict[str, Any]:
        return {
            "ticket_id": self.ticket_id,
            "worker_id": self.worker_id,
            "navigation": [result.body for result in self.navigation],
            "response": self.llm_result.response,
            "manual_control": {
                "mode": self.manual_control.mode,
                "pause_before_navigation": self.manual_control.pause_before_navigation,
                "pause_before_prompt": self.manual_control.pause_before_prompt,
                "pause_before_capture": self.manual_control.pause_before_capture,
            },
        }


class ManualController(Protocol):
    """Hook that enables manual control over orchestration stages."""

    def await_confirmation(self, stage: str, parcel: WorkParcel) -> None:
        """Block until a human has reviewed and approved the stage."""


class NullManualController:
    """Default controller that performs no blocking and runs fully automated."""

    def await_confirmation(
        self, stage: str, parcel: WorkParcel
    ) -> None:  # pragma: no cover - trivial
        return


class HttpClient:
    """Thin wrapper around ``urllib`` so it can be mocked easily in tests."""

    def request(self, navigation: NavigationRequest) -> NavigationResult:
        data = None
        if navigation.payload:
            data = urlencode(navigation.payload, doseq=True).encode()
        req = urllib_request.Request(navigation.url, data=data, method=navigation.method.upper())
        if navigation.headers:
            for key, value in navigation.headers.items():
                req.add_header(key, value)
        try:
            with urllib_request.urlopen(req, timeout=navigation.timeout) as response:
                body = response.read().decode("utf-8", errors="replace")
                return NavigationResult(
                    status=response.status, body=body, metadata=dict(response.headers)
                )
        except URLError as error:  # pragma: no cover - network errors will be simulated in tests
            raise RuntimeError(f"Failed to navigate to {navigation.url}: {error}") from error


class WebNavigator:
    """Executes navigation requests to gather context for a ticket."""

    def __init__(self, client: HttpClient | None = None) -> None:
        self._client = client or HttpClient()

    def run(self, request: NavigationRequest) -> NavigationResult:
        return self._client.request(request)


class LLMWebPrompter:
    """Submits prompts to an LLM web surface using POST requests."""

    def __init__(self, client: HttpClient | None = None) -> None:
        self._client = client or HttpClient()

    def submit(self, endpoint: str, prompt: str, tuning: PromptTuning) -> PromptResult:
        navigation = NavigationRequest(
            url=endpoint,
            method="POST",
            payload={
                "prompt": prompt,
                "temperature": tuning.temperature,
                "max_tokens": tuning.max_tokens,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        result = self._client.request(navigation)
        return PromptResult(prompt=prompt, response=result.body, tuning=tuning)


class WorkProductCapture:
    """Stores work products in memory for later retrieval or reporting."""

    def __init__(self) -> None:
        self._artifacts: dict[str, WorkProduct] = {}

    def record(self, product: WorkProduct) -> None:
        self._artifacts[product.ticket_id] = product

    def get(self, ticket_id: str) -> WorkProduct | None:
        return self._artifacts.get(ticket_id)


class AutomationOrchestrator:
    """Coordinates navigation, prompting and capture for a work parcel."""

    def __init__(
        self,
        navigator: WebNavigator,
        prompter: LLMWebPrompter,
        capture: WorkProductCapture,
        controller: ManualController | None = None,
    ) -> None:
        self._navigator = navigator
        self._prompter = prompter
        self._capture = capture
        self._controller = controller or NullManualController()

    def execute(self, parcel: WorkParcel, engineer: PromptEngineer) -> WorkProduct:
        navigation_logs: list[NavigationResult] = []
        if parcel.ticket.entry_url:
            if parcel.manual_control.pause_before_navigation:
                self._controller.await_confirmation("navigation", parcel)
            request = NavigationRequest(url=parcel.ticket.entry_url)
            navigation_logs.append(self._navigator.run(request))

        if parcel.manual_control.pause_before_prompt:
            self._controller.await_confirmation("prompt", parcel)

        prompt_payload = engineer.build_payload(parcel.ticket.prompt, parcel.ticket.context)
        llm_result = self._prompter.submit(
            parcel.ticket.llm_endpoint, prompt_payload, parcel.prompt_tuning
        )
        engineer.validate_response(llm_result.response)

        if parcel.manual_control.pause_before_capture:
            self._controller.await_confirmation("capture", parcel)

        product = WorkProduct(
            ticket_id=parcel.ticket.identifier,
            worker_id=parcel.worker.identifier,
            navigation=navigation_logs,
            llm_result=llm_result,
            manual_control=parcel.manual_control,
        )
        self._capture.record(product)
        return product
