import argparse
import json
import os
import sys
import time
from typing import Any

import requests
import yaml
from opentelemetry import propagate, trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.trace import SpanKind
from prometheus_client import Counter, Histogram, start_http_server

CATALOG_PATH = os.environ.get("GP_CATALOG", "observability/golden_paths.yaml")
DEFAULT_METRICS_PORT = int(os.environ.get("GP_METRICS_PORT", "9464"))

GP_LATENCY = Histogram(
    "gp_step_latency_seconds",
    "Golden path step latency",
    labelnames=("journey", "step"),
)
GP_ERRORS = Counter(
    "gp_step_errors_total",
    "Golden path step failures",
    labelnames=("journey", "step", "reason"),
)
GP_RATIO = Histogram(
    "gp_journey_success_ratio",
    "Golden path journey success ratio",
    labelnames=("journey",),
)


def load_catalog(path: str) -> dict[str, Any]:
    with open(path, encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    journeys = {j["id"]: j for j in data.get("journeys", [])}
    return {"journeys": journeys}


def init_tracer() -> None:
    resource = Resource.create(
        {
            "service.name": os.environ.get("OTEL_SERVICE_NAME", "synth-probe"),
            "service.version": os.environ.get("GIT_SHA", "dev"),
            "deployment.environment": os.environ.get("DEPLOY_ENV", "local"),
            "k8s.namespace": os.environ.get("K8S_NAMESPACE", "dev"),
            "pr_number": os.environ.get("PR_NUMBER", ""),
        }
    )
    provider = TracerProvider(resource=resource)
    exporter_endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT")
    if exporter_endpoint:
        exporter = OTLPSpanExporter(endpoint=exporter_endpoint)
        provider.add_span_processor(BatchSpanProcessor(exporter))
    provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
    trace.set_tracer_provider(provider)


class JourneyRunner:
    def __init__(
        self, catalog: dict[str, Any], base_url: str, headers: dict[str, str], timeout: int
    ):
        self.catalog = catalog
        self.base_url = base_url.rstrip("/")
        self.headers = headers
        self.timeout = timeout
        self.tracer = trace.get_tracer(__name__)

    def list_journeys(self) -> list[dict[str, Any]]:
        return list(self.catalog["journeys"].values())

    def run_journey(self, journey_id: str, samples: int = 1) -> dict[str, Any]:
        journey = self.catalog["journeys"].get(journey_id)
        if not journey:
            raise ValueError(f"Unknown journey {journey_id}")
        successes = 0
        results = []
        for _ in range(samples):
            journey_success = True
            for step in journey.get("steps", []):
                result = self._run_step(journey_id, step)
                results.append(result)
                if not result["success"]:
                    journey_success = False
                    break
            successes += 1 if journey_success else 0
        success_ratio = successes / max(samples, 1)
        GP_RATIO.labels(journey=journey_id).observe(success_ratio)
        return {"journey": journey_id, "success_ratio": success_ratio, "steps": results}

    def _run_step(self, journey_id: str, step: dict[str, Any]) -> dict[str, Any]:
        url = f"{self.base_url}{step['target']}"
        method = step.get("method", "GET").upper()
        expected_status = step.get("expected_status", 200)
        start = time.time()
        with self.tracer.start_as_current_span(
            name=f"{journey_id}:{step['id']}", kind=SpanKind.CLIENT
        ) as span:
            span.set_attribute("journey.id", journey_id)
            span.set_attribute("journey.step", step["id"])
            span.set_attribute("route.name", step.get("target"))
            span.set_attribute("tenant.id", self.headers.get("X-Tenant", ""))
            span.set_attribute("canary.weight", float(os.environ.get("CANARY_WEIGHT", "0")))
            span.set_attribute("feature.flags", os.environ.get("FEATURE_FLAGS", ""))
            span.set_attribute("pr_number", os.environ.get("PR_NUMBER", ""))
            span.set_attribute("release.sha", os.environ.get("GIT_SHA", ""))

            request_headers = dict(self.headers)
            carrier: dict[str, str] = {}
            propagate.inject(carrier)
            request_headers.update(carrier)
            response = None
            error_reason: str | None = None
            try:
                response = requests.request(
                    method,
                    url,
                    timeout=self.timeout,
                    headers=request_headers,
                )
            except requests.RequestException as exc:  # pragma: no cover - network exceptions
                error_reason = "request_error"
                span.record_exception(exc)
            duration = time.time() - start
            GP_LATENCY.labels(journey=journey_id, step=step["id"]).observe(duration)
            success = False
            status_code = response.status_code if response else None
            if response and status_code == expected_status:
                success = True
                if step.get("assertions"):
                    try:
                        payload = response.json()
                        for assertion in step["assertions"]:
                            key = assertion.get("json")
                            if key and key not in payload:
                                success = False
                                error_reason = f"missing-{key}"
                                break
                    except ValueError:
                        success = False
                        error_reason = "invalid-json"
            else:
                error_reason = error_reason or "status_mismatch"
            if not success:
                span.set_attribute("error", True)
                GP_ERRORS.labels(journey=journey_id, step=step["id"], reason=error_reason).inc()
            span.set_attribute("http.status_code", status_code or 0)
            span.set_attribute("gp.expected_status", expected_status)
            span.set_attribute("gp.duration_ms", int(duration * 1000))
        return {
            "step": step["id"],
            "success": success,
            "status_code": status_code,
            "duration_ms": int(duration * 1000),
            "reason": None if success else error_reason,
        }


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Golden path synthetic probe")
    subparsers = parser.add_subparsers(dest="command", required=True)

    list_parser = subparsers.add_parser("list", help="List journeys")
    list_parser.add_argument("--catalog", default=CATALOG_PATH)

    run_parser = subparsers.add_parser("run", help="Run a golden path journey")
    run_parser.add_argument("--journey", required=True)
    run_parser.add_argument("--catalog", default=CATALOG_PATH)
    run_parser.add_argument("--base", required=True, help="Base URL for the target")
    run_parser.add_argument("--tenant", default=os.environ.get("TENANT", "synthetic"))
    run_parser.add_argument("--token", default=os.environ.get("AUTH_TOKEN"))
    run_parser.add_argument("--samples", type=int, default=1)
    run_parser.add_argument("--timeout", type=int, default=20)
    run_parser.add_argument("--headers", nargs="*", default=[])
    run_parser.add_argument("--export", choices=["prometheus"], help="Enable metric export")

    return parser.parse_args(argv)


def header_dict(header_list: list[str], tenant: str, token: str | None) -> dict[str, str]:
    headers: dict[str, str] = {"X-Tenant": tenant, "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    for item in header_list:
        if "=" in item:
            key, value = item.split("=", 1)
            headers[key] = value
    return headers


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    init_tracer()
    catalog = load_catalog(args.catalog)

    if args.command == "list":
        journeys = catalog["journeys"].values()
        print(
            json.dumps(
                [
                    {"id": j["id"], "name": j.get("name"), "steps": len(j.get("steps", []))}
                    for j in journeys
                ],
                indent=2,
            )
        )
        return 0

    if args.command == "run":
        if args.export == "prometheus":
            start_http_server(DEFAULT_METRICS_PORT)
        headers = header_dict(args.headers, args.tenant, args.token)
        runner = JourneyRunner(catalog, args.base, headers, args.timeout)
        try:
            result = runner.run_journey(args.journey, samples=args.samples)
        except ValueError as exc:
            print(str(exc), file=sys.stderr)
            return 4
        print(json.dumps(result, indent=2))
        if result["success_ratio"] >= 1:
            return 0
        if result["success_ratio"] == 0:
            return 2
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
