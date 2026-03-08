import os

from summit.evaluators.base import BaseEvaluator


class HF2602Evaluator(BaseEvaluator):
    @property
    def name(self) -> str:
        return "hf_2602_18283"

    @property
    def feature_flag(self) -> str:
        return "HF2602_18283_ENABLED"

    def is_enabled(self) -> bool:
        return os.environ.get(self.feature_flag, "0") == "1"

    def evaluate(self, dataset, config):
        if not self.is_enabled():
            print(f"{self.name} is disabled. Set {self.feature_flag}=1 to enable.")
            return {}

        # evaluation logic will go here
        return {"status": "success"}
