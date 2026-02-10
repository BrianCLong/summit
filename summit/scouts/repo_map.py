from typing import Any

from .base import Config, Result, Scout


class RepoMapScout(Scout):
    def name(self) -> str:
        return "repo_map"

    def run(self, ctx: Any, cfg: Config) -> Result:
        # TODO: implement deterministic tree walk + hash list
        return Result()
