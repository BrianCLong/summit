"""Lightweight feature flag SDK with typed accessors and graceful fallbacks."""

from __future__ import annotations

import hashlib
import json
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from tools.flagctl.simple_yaml import load as load_yaml

FlagPrimitive = Any


@dataclass
class FlagContext:
    env: str
    tenant: str | None = None
    user_id: str | None = None
    user_role: str | None = None
    region: str | None = None
    canary_weight: float | None = None
    pr_number: str | None = None


@dataclass
class FlagDefinition:
    key: str
    type: str
    default: FlagPrimitive
    kill_switch: bool | None = None


class CacheEntry:
    def __init__(self, value: FlagPrimitive, source: str, ttl_ms: int) -> None:
        self.value = value
        self.source = source
        self.expires_at = time.time() + ttl_ms / 1000

    def valid(self) -> bool:
        return time.time() < self.expires_at


class EnvProvider:
    name = "env"

    def get(self, key: str, _ctx: FlagContext) -> FlagPrimitive | None:
        env_key = f"FLAG_{''.join(c if c.isalnum() else '_' for c in key).upper()}"
        if env_key in os.environ:
            raw = os.environ[env_key]
            if raw in {"true", "false"}:
                return raw == "true"
            try:
                return float(raw)
            except ValueError:
                return raw
        return None


class FileProvider:
    name = "file"

    def __init__(self, targets_dir: Path) -> None:
        self.targets_dir = targets_dir
        self.cache: dict[Path, dict[str, Any]] = {}
        self.mtimes: dict[Path, float] = {}

    def get(self, key: str, ctx: FlagContext) -> FlagPrimitive | None:
        file_path = self.targets_dir / f"{ctx.env}.yaml"
        if not file_path.exists():
            return None
        mtime = file_path.stat().st_mtime
        if file_path not in self.cache or self.mtimes[file_path] < mtime:
            self.cache[file_path] = load_yaml(file_path.read_text()) or {}
            self.mtimes[file_path] = mtime
        entry = (self.cache[file_path].get("flags") or {}).get(key)
        if not entry:
            return None
        if entry.get("kill") is True:
            return False
        tenant = ctx.tenant
        tenants = entry.get("tenants") or {}
        if tenant and tenant in tenants.get("deny", []):
            return False
        if tenant and tenant in tenants.get("allow", []):
            return entry.get("value", True)
        percentage = entry.get("percentage")
        if isinstance(percentage, (int, float)):
            seed = tenant or ctx.user_id or ctx.region or "global"
            if _percentage_hit(seed, entry.get("salt") or key, percentage):
                return entry.get("value", True)
            return False
        if entry.get("environments") and ctx.env not in entry.get("environments"):
            return None
        if "value" in entry:
            return entry["value"]
        return None


class RemoteProvider:
    name = "remote"

    def __init__(self, endpoint: str | None) -> None:
        self.endpoint = endpoint
        self.cached: dict[str, FlagPrimitive] = {}

    def get(self, key: str, ctx: FlagContext) -> FlagPrimitive | None:
        if not self.endpoint:
            return None
        import urllib.parse
        import urllib.request

        query = urllib.parse.urlencode({"key": key, "env": ctx.env, "tenant": ctx.tenant or ""})
        try:
            with urllib.request.urlopen(f"{self.endpoint}/flags/evaluate?{query}") as resp:
                data = json.loads(resp.read().decode("utf-8"))
                self.cached[key] = data.get("value")
                return self.cached[key]
        except Exception:
            return self.cached.get(key)


def _percentage_hit(seed: str, salt: str, percent: float) -> bool:
    digest = hashlib.sha256(f"{seed}:{salt}".encode()).hexdigest()
    return int(digest[:8], 16) % 10000 < percent * 100


class FlagClient:
    def __init__(
        self,
        env: str,
        targets_dir: str | Path = "flags/targets",
        catalog_path: str | Path = "flags/catalog.yaml",
        remote_endpoint: str | None = None,
        cache_ttl_ms: int = 60000,
    ) -> None:
        self.env = env
        self.cache_ttl_ms = cache_ttl_ms
        self.cache: dict[str, CacheEntry] = {}
        self.catalog = self._load_catalog(Path(catalog_path))
        self.providers = [
            EnvProvider(),
            FileProvider(Path(targets_dir)),
            RemoteProvider(remote_endpoint),
        ]

    def catalog_key(self, key: str) -> str:
        return key

    def kill(self, key: str) -> None:
        self.cache[key] = CacheEntry(False, "kill-switch", self.cache_ttl_ms)

    def get(
        self, key: str, default: FlagPrimitive | None = None, ctx: FlagContext | None = None
    ) -> FlagPrimitive:
        ctx = ctx or FlagContext(env=self.env)
        cached = self.cache.get(key)
        if cached and cached.valid():
            return cached.value
        for provider in self.providers:
            value = provider.get(key, ctx)
            if value is not None:
                self.cache[key] = CacheEntry(value, provider.name, self.cache_ttl_ms)
                return value
        if key in self.catalog:
            self.cache[key] = CacheEntry(self.catalog[key].default, "catalog", self.cache_ttl_ms)
            return self.catalog[key].default
        if default is not None:
            self.cache[key] = CacheEntry(default, "default", self.cache_ttl_ms)
            return default
        raise KeyError(f"flag {key} missing default value")

    def _load_catalog(self, path: Path) -> dict[str, FlagDefinition]:
        if not path.exists():
            return {}
        data = load_yaml(path.read_text()) or {}
        catalog: dict[str, FlagDefinition] = {}
        for item in data.get("flags", []):
            catalog[item["key"]] = FlagDefinition(**item)
        return catalog


default_client = FlagClient(env=os.environ.get("NODE_ENV", "dev"))


def with_flags(key: str, ctx: FlagContext | None = None) -> FlagPrimitive:
    return default_client.get(key, ctx=ctx)


__all__ = ["FlagClient", "FlagContext", "FlagDefinition", "default_client", "with_flags"]
