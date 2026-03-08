"""
ACP Registry Client.
Implements registry fetch, parsing, and normalization.
"""
from __future__ import annotations

import json
import urllib.request
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Union

REGISTRY_URL = "https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json"

@dataclass(frozen=True)
class NpxDist:
    package: str
    args: list[str]
    env: dict[str, str]

@dataclass(frozen=True)
class BinaryVariant:
    archive: str
    cmd: str
    args: list[str]
    env: dict[str, str]

@dataclass(frozen=True)
class BinaryDist:
    variants: dict[str, BinaryVariant]  # e.g., "linux-x86_64"

Distribution = Union[NpxDist, BinaryDist]

@dataclass(frozen=True)
class AgentDescriptor:
    id: str
    name: str
    version: str
    description: str
    repository: Optional[str]
    authors: list[str]
    license: str
    icon: Optional[str]
    distribution: Optional[Distribution]

def fetch_registry_json(url: str = REGISTRY_URL, timeout_s: int = 10) -> dict[str, Any]:
    req = urllib.request.Request(url, headers={"User-Agent": "Summit/1.0"})
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        data = resp.read().decode("utf-8")
    return json.loads(data)

def parse_agents(doc: dict[str, Any]) -> list[AgentDescriptor]:
    agents: list[AgentDescriptor] = []
    for a in doc.get("agents", []):
        dist = _parse_distribution(a.get("distribution"))
        agents.append(
            AgentDescriptor(
                id=a["id"],
                name=a["name"],
                version=a.get("version", ""),
                description=a.get("description", ""),
                repository=a.get("repository"),
                authors=[s.strip() for s in a.get("authors", [])],
                license=a.get("license", "unknown"),
                icon=a.get("icon"),
                distribution=dist,
            )
        )
    return agents

def _parse_distribution(d: Optional[dict[str, Any]]) -> Optional[Distribution]:
    if not d:
        return None
    if "npx" in d:
        n = d["npx"]
        return NpxDist(package=n["package"], args=list(n.get("args", [])), env=dict(n.get("env", {})))
    if "binary" in d:
        out: dict[str, BinaryVariant] = {}
        for k, v in d["binary"].items():
            out[k] = BinaryVariant(
                archive=v["archive"],
                cmd=v["cmd"],
                args=list(v.get("args", [])),
                env=dict(v.get("env", {})),
            )
        return BinaryDist(variants=out)
    return None
