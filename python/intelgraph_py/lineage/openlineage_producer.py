import datetime
import os
import uuid
from typing import Any, Dict, List, Optional

import yaml
from openlineage.client import OpenLineageClient
from openlineage.client.event_v2 import Dataset, Job, Run, RunEvent, RunState

try:
    from opentelemetry import trace
except ImportError:
    trace = None


class OpenLineageProducer:
    def __init__(self, namespace: str = "summit_intelgraph"):
        self.namespace = namespace
        config_path = os.path.join(os.path.dirname(__file__), "../../config/openlineage.yaml")

        if os.path.exists(config_path):
            try:
                with open(config_path) as f:
                    config = yaml.safe_load(f)
                    if config:
                        if "url" in config and "OPENLINEAGE_URL" not in os.environ:
                            os.environ["OPENLINEAGE_URL"] = config["url"]
                        if "api_key" in config and "OPENLINEAGE_API_KEY" not in os.environ:
                             os.environ["OPENLINEAGE_API_KEY"] = config["api_key"]
                        if "namespace" in config:
                            self.namespace = config["namespace"]
            except Exception as e:
                print(f"Warning: Failed to load config from {config_path}: {e}")

        self.client = OpenLineageClient.from_environment()

    def _create_run_event(self,
                          event_type: RunState,
                          job_name: str,
                          run_id: str,
                          inputs: Optional[list[dict[str, Any]]] = None,
                          outputs: Optional[list[dict[str, Any]]] = None,
                          run_facets: Optional[dict[str, Any]] = None,
                          job_facets: Optional[dict[str, Any]] = None) -> RunEvent:

        input_datasets = []
        if inputs:
            for inp in inputs:
                input_datasets.append(Dataset(namespace=self.namespace, name=inp.get("name", "unknown"), facets=inp.get("facets", {})))

        output_datasets = []
        if outputs:
            for out in outputs:
                output_datasets.append(Dataset(namespace=self.namespace, name=out.get("name", "unknown"), facets=out.get("facets", {})))

        final_run_facets = (run_facets or {}).copy()

        # Add OpenTelemetry trace context if available
        if trace:
            span = trace.get_current_span()
            if span.get_span_context().is_valid:
                ctx = span.get_span_context()
                final_run_facets["trace"] = {
                    "traceId": format(ctx.trace_id, '032x'),
                    "spanId": format(ctx.span_id, '016x'),
                    "_producer": "https://github.com/open-telemetry/opentelemetry-python",
                    "_schemaURL": "https://github.com/OpenLineage/OpenLineage/blob/main/spec/OpenLineage.json"
                }

        return RunEvent(
            eventType=event_type,
            eventTime=datetime.datetime.now(datetime.UTC).isoformat(),
            run=Run(runId=run_id, facets=final_run_facets),
            job=Job(namespace=self.namespace, name=job_name, facets=job_facets or {}),
            inputs=input_datasets,
            outputs=output_datasets,
            producer="https://github.com/BrianCLong/summit/python/intelgraph_py/lineage"
        )

    def emit_start(self, job_name: str, run_id: str, inputs: Optional[list[dict[str, Any]]] = None, run_facets: Optional[dict[str, Any]] = None, job_facets: Optional[dict[str, Any]] = None):
        """Emits a START event."""
        try:
            event = self._create_run_event(RunState.START, job_name, run_id, inputs=inputs, run_facets=run_facets, job_facets=job_facets)
            self.client.emit(event)
        except Exception as e:
            # Fail silently or log, don't crash the app
            print(f"Error emitting OpenLineage START event: {e}")

    def emit_complete(self, job_name: str, run_id: str, outputs: Optional[list[dict[str, Any]]] = None, run_facets: Optional[dict[str, Any]] = None, job_facets: Optional[dict[str, Any]] = None):
        """Emits a COMPLETE event."""
        try:
            event = self._create_run_event(RunState.COMPLETE, job_name, run_id, outputs=outputs, run_facets=run_facets, job_facets=job_facets)
            self.client.emit(event)
        except Exception as e:
            print(f"Error emitting OpenLineage COMPLETE event: {e}")

    def emit_fail(self, job_name: str, run_id: str, error_message: str, run_facets: Optional[dict[str, Any]] = None, job_facets: Optional[dict[str, Any]] = None):
        """Emits a FAIL event."""
        try:
            final_run_facets = (run_facets or {}).copy()
            if error_message:
                final_run_facets["errorMessage"] = {"message": error_message}

            event = self._create_run_event(RunState.FAIL, job_name, run_id, run_facets=final_run_facets, job_facets=job_facets)
            self.client.emit(event)
        except Exception as e:
            print(f"Error emitting OpenLineage FAIL event: {e}")

    def emit_batch(self, events: list[dict[str, Any]]):
        """
        Emits a batch of events.

        Args:
            events: List of dictionaries containing event parameters.
                    Each dict should have: 'event_type', 'job_name', 'run_id', and optionally 'inputs', 'outputs', 'run_facets', 'job_facets'.
        """
        try:
            # If the client supports batch emission in future versions, use it here.
            # Currently, we iterate and emit individually.
            if hasattr(self.client, "emit_batch"):
                 # Assuming create_run_event logic is needed, we first create RunEvents
                 run_events = []
                 for evt in events:
                     event_type = evt.get("event_type")
                     # map string to RunState if needed
                     if isinstance(event_type, str):
                         if event_type == "START": event_type = RunState.START
                         elif event_type == "COMPLETE": event_type = RunState.COMPLETE
                         elif event_type == "FAIL": event_type = RunState.FAIL

                     run_events.append(self._create_run_event(
                         event_type=event_type,
                         job_name=evt.get("job_name"),
                         run_id=evt.get("run_id"),
                         inputs=evt.get("inputs"),
                         outputs=evt.get("outputs"),
                         run_facets=evt.get("run_facets"),
                         job_facets=evt.get("job_facets")
                     ))
                 self.client.emit_batch(run_events)
            else:
                for evt in events:
                    event_type = evt.get("event_type")
                    if event_type == "START" or event_type == RunState.START:
                        self.emit_start(evt.get("job_name"), evt.get("run_id"), inputs=evt.get("inputs"), run_facets=evt.get("run_facets"), job_facets=evt.get("job_facets"))
                    elif event_type == "COMPLETE" or event_type == RunState.COMPLETE:
                        self.emit_complete(evt.get("job_name"), evt.get("run_id"), outputs=evt.get("outputs"), run_facets=evt.get("run_facets"), job_facets=evt.get("job_facets"))
                    elif event_type == "FAIL" or event_type == RunState.FAIL:
                        self.emit_fail(evt.get("job_name"), evt.get("run_id"), error_message=evt.get("error_message"), run_facets=evt.get("run_facets"), job_facets=evt.get("job_facets"))
                    else:
                        print(f"Unknown event type in batch: {event_type}")

        except Exception as e:
            print(f"Error emitting OpenLineage batch: {e}")
