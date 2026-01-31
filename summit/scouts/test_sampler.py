from typing import Any

from .base import Config, Result, Scout


class TestSamplerScout(Scout):
    def name(self) -> str:
        return "test_sampler"

    def run(self, ctx: Any, cfg: Config) -> Result:
        # TODO: implement safe test sampling
        return Result()
