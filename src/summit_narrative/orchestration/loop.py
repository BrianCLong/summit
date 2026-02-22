from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict


@dataclass
class LoopConfig:
    simulate_only: bool = True


class ControlLoopManager:
    def __init__(self, agents: dict[str, Any], cfg: LoopConfig) -> None:
        self.agents = agents
        self.cfg = cfg

    def tick(self, ctx: dict[str, Any]) -> dict[str, Any]:
        ctx = self.agents["scout"].run(ctx)
        ctx = self.agents["cartographer"].run(ctx)
        ctx = self.agents["forecaster"].run(ctx)
        ctx = self.agents["strategist"].run(ctx)
        ctx = self.agents["governor"].run(ctx)
        ctx["simulate_only"] = self.cfg.simulate_only
        return ctx
