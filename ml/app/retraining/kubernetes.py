"""Utilities for scheduling retraining runs on Kubernetes."""

from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import dataclass
from typing import Dict, Optional

logger = logging.getLogger(__name__)


@dataclass
class ScheduledJob:
    """Metadata returned when a retraining job is scheduled."""

    job_name: str
    namespace: str
    manifest: Dict[str, object]


class KubernetesJobScheduler:
    """Create Kubernetes ``Job`` resources for ML retraining.

    The implementation attempts to use the official Kubernetes Python client but
    degrades gracefully when the dependency is not available (for example in
    unit tests).  Consumers always receive the manifest that *would* have been
    submitted so they can inspect or persist it.
    """

    def __init__(
        self,
        namespace: Optional[str] = None,
        image: Optional[str] = None,
        service_account: Optional[str] = None,
    ) -> None:
        self.namespace = namespace or os.getenv("RETRAINING_NAMESPACE", "default")
        self.image = image or os.getenv("RETRAINING_IMAGE", "intelgraph/ml-retrainer:latest")
        self.service_account = service_account or os.getenv("RETRAINING_SERVICE_ACCOUNT")
        self._client = None

        try:  # pragma: no cover - optional dependency
            from kubernetes import client, config

            config.load_incluster_config()
            self._client = client.BatchV1Api()
            self._client_models = client
            logger.info("Using in-cluster Kubernetes configuration for retraining jobs")
        except Exception:  # pragma: no cover - fall back to local config
            try:
                from kubernetes import client, config

                config.load_kube_config()
                self._client = client.BatchV1Api()
                self._client_models = client
                logger.info("Loaded kubeconfig for retraining job submissions")
            except Exception as exc:
                logger.warning("Kubernetes client unavailable, operating in dry-run mode: %s", exc)
                self._client = None
                self._client_models = None

    async def schedule(
        self,
        *,
        job_id: str,
        model_id: str,
        data_window_start: Optional[str],
        data_window_end: Optional[str],
        extra_env: Optional[Dict[str, str]] = None,
    ) -> ScheduledJob:
        """Create a Kubernetes job for the retraining run."""

        manifest = self._build_manifest(
            job_id=job_id,
            model_id=model_id,
            data_window_start=data_window_start,
            data_window_end=data_window_end,
            extra_env=extra_env,
        )

        if self._client is not None:
            await asyncio.get_running_loop().run_in_executor(
                None,
                self._client.create_namespaced_job,
                self.namespace,
                manifest,
            )

        job_name = (
            manifest.metadata.name  # type: ignore[attr-defined]
            if hasattr(manifest, "metadata")
            else manifest["metadata"]["name"]
        )
        logger.info("Prepared Kubernetes retraining job", {"job_id": job_id, "name": job_name})

        return ScheduledJob(
            job_name=job_name,
            namespace=self.namespace,
            manifest=manifest.to_dict() if hasattr(manifest, "to_dict") else manifest,
        )

    # ------------------------------------------------------------------
    def _build_manifest(
        self,
        *,
        job_id: str,
        model_id: str,
        data_window_start: Optional[str],
        data_window_end: Optional[str],
        extra_env: Optional[Dict[str, str]] = None,
    ):
        job_name = f"ml-retrain-{job_id[:8]}"
        env_vars = {
            "MODEL_ID": model_id,
            "RETRAINING_JOB_ID": job_id,
        }
        if data_window_start:
            env_vars["DATA_WINDOW_START"] = data_window_start
        if data_window_end:
            env_vars["DATA_WINDOW_END"] = data_window_end
        if extra_env:
            env_vars.update(extra_env)

        if self._client_models is None:
            # When kubernetes library is unavailable we build a lightweight dict
            return {
                "apiVersion": "batch/v1",
                "kind": "Job",
                "metadata": {"name": job_name, "namespace": self.namespace},
                "spec": {
                    "template": {
                        "metadata": {"labels": {"job-id": job_id}},
                        "spec": {
                            "restartPolicy": "Never",
                            "containers": [
                                {
                                    "name": "trainer",
                                    "image": self.image,
                                    "env": [
                                        {"name": key, "value": value} for key, value in env_vars.items()
                                    ],
                                }
                            ],
                        },
                    },
                    "backoffLimit": 1,
                },
            }

        client = self._client_models
        container = client.V1Container(
            name="trainer",
            image=self.image,
            env=[client.V1EnvVar(name=key, value=value) for key, value in env_vars.items()],
        )
        pod_spec = client.V1PodSpec(
            containers=[container],
            restart_policy="Never",
            service_account_name=self.service_account,
        )
        template = client.V1PodTemplateSpec(
            metadata=client.V1ObjectMeta(labels={"job-id": job_id}),
            spec=pod_spec,
        )
        job_spec = client.V1JobSpec(template=template, backoff_limit=1)
        job = client.V1Job(
            api_version="batch/v1",
            kind="Job",
            metadata=client.V1ObjectMeta(name=job_name, namespace=self.namespace),
            spec=job_spec,
        )
        return job


__all__ = ["KubernetesJobScheduler", "ScheduledJob"]
