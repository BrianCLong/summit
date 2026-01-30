from typing import Any
from .base import Scout, Config, Result

class TestSamplerScout(Scout):
    def name(self) -> str:
        return "test_sampler"

    def run(self, ctx: Any, cfg: Config) -> Result:
        # TODO: implement safe test sampling
        return Result()
