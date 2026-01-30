from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class K8sAuth:
    # Never log these fields.
    kubeconfig_b64: Optional[str] = None
    token: Optional[str] = None
    endpoint: Optional[str] = None

@dataclass(frozen=True)
class ClusterRef:
    cluster_id: str
    display_name: str

def redact_secrets(obj: object) -> str:
    return "<redacted>"

def validate_read_only_mode() -> None:
    # TODO: enforce RBAC docs + runtime check hook
    return
