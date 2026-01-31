import datetime
import os
import uuid
from typing import Any, Dict, List, Optional

import yaml
from openlineage.client import OpenLineageClient
from openlineage.client.event_v2 import Dataset, Job, Run, RunEvent, RunState


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
                          outputs: Optional[list[dict[str, Any]]] = None) -> RunEvent:

        input_datasets = []
        if inputs:
            for inp in inputs:
                input_datasets.append(Dataset(namespace=self.namespace, name=inp.get("name", "unknown"), facets={}))

        output_datasets = []
        if outputs:
            for out in outputs:
                output_datasets.append(Dataset(namespace=self.namespace, name=out.get("name", "unknown"), facets={}))

        return RunEvent(
            eventType=event_type,
            eventTime=datetime.datetime.now(datetime.UTC).isoformat(),
            run=Run(runId=run_id, facets={}),
            job=Job(namespace=self.namespace, name=job_name, facets={}),
            inputs=input_datasets,
            outputs=output_datasets,
            producer="https://github.com/BrianCLong/summit/python/intelgraph_py/lineage"
        )

    def emit_start(self, job_name: str, run_id: str, inputs: Optional[list[dict[str, Any]]] = None):
        """Emits a START event."""
        try:
            event = self._create_run_event(RunState.START, job_name, run_id, inputs=inputs)
            self.client.emit(event)
        except Exception as e:
            # Fail silently or log, don't crash the app
            print(f"Error emitting OpenLineage START event: {e}")

    def emit_complete(self, job_name: str, run_id: str, outputs: Optional[list[dict[str, Any]]] = None):
        """Emits a COMPLETE event."""
        try:
            event = self._create_run_event(RunState.COMPLETE, job_name, run_id, outputs=outputs)
            self.client.emit(event)
        except Exception as e:
            print(f"Error emitting OpenLineage COMPLETE event: {e}")

    def emit_fail(self, job_name: str, run_id: str, error_message: str):
        """Emits a FAIL event."""
        try:
            event = self._create_run_event(RunState.FAIL, job_name, run_id)
            # Add error info to facets if needed (omitted for brevity)
            self.client.emit(event)
        except Exception as e:
            print(f"Error emitting OpenLineage FAIL event: {e}")
