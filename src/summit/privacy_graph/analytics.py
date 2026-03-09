from __future__ import annotations

from typing import Any, Dict, List

from .config import PrivacyGraphConfig
from .graph_builder import build_graph
from .he_adapter import CipherTensor, HESimulatedBackend, PlaintextBackend, SecureBackend
from .policy import PrivacyGraphPolicy
from .types import GraphEvent


def get_backend(cfg: PrivacyGraphConfig) -> SecureBackend:
    if cfg.backend == "plaintext":
        return PlaintextBackend()
    elif cfg.backend == "he_simulated":
        return HESimulatedBackend()
    else:
        # Should satisfy policy validation, but just in case
        raise ValueError(f"Unknown backend: {cfg.backend}")

def run_analytics(events: list[GraphEvent], cfg: PrivacyGraphConfig) -> dict[str, Any]:
    # 1. Validate Config
    PrivacyGraphPolicy.validate(cfg)

    # 2. Build Graph (PII stripping)
    frame = build_graph(events)

    # 3. Select Backend
    backend = get_backend(cfg)

    # 4. Simulate computation
    # e.g. encrypt node counts or something trivial
    # For now, just prove we used the backend

    encrypted_nodes = backend.encrypt(str(len(frame.nodes)).encode())
    decrypted = backend.decrypt(encrypted_nodes)

    return {
        "node_count": int(decrypted.decode()),
        "backend_used": backend.name,
        "is_encrypted": isinstance(encrypted_nodes, CipherTensor)
    }
