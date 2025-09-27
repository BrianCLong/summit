"""Core evaluation harness for MFUE."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List

import numpy as np

from .baselines import BaseUnlearningBaseline
from .config import DEFAULT_CONFIG, ReproducibilityConfig
from .datasets import DatasetSplit
from .metrics import (
    EvaluationResult,
    accuracy,
    bootstrap_p_value,
    log_loss,
    membership_inference_auc,
)
from .models import LogisticRegressionModel
from .report import EvaluationReport


@dataclass
class MFUEvaluator:
    """Evaluate machine unlearning runs against MFUE metrics."""

    config: ReproducibilityConfig = DEFAULT_CONFIG

    def _prepare_rngs(self, seeds: Iterable[int]) -> List[np.random.Generator]:
        return [np.random.default_rng(seed) for seed in seeds]

    def evaluate(
        self,
        model: LogisticRegressionModel,
        *,
        forget_split: DatasetSplit,
        retain_split: DatasetSplit,
        holdout_split: DatasetSplit,
        baseline: BaseUnlearningBaseline,
        seeds: Iterable[int] | None = None,
    ) -> EvaluationResult:
        """Run the evaluation for a single model instance."""

        if seeds is None:
            seeds = [self.config.seed]
        seeds = list(seeds)
        rngs = self._prepare_rngs(seeds)

        pre_forget_probs = model.predict_proba(forget_split.features)[:, 1]
        post_models = [
            baseline.unlearn(model, forget_split, retain_split)
            for _ in rngs
        ]

        post_forget_probs = np.mean(
            [m.predict_proba(forget_split.features)[:, 1] for m in post_models],
            axis=0,
        )
        pre_forget_acc = accuracy(forget_split.labels, (pre_forget_probs >= 0.5).astype(int))
        post_forget_acc = accuracy(
            forget_split.labels, (post_forget_probs >= 0.5).astype(int)
        )
        forget_logloss_delta = log_loss(
            forget_split.labels,
            post_forget_probs,
        ) - log_loss(
            forget_split.labels,
            pre_forget_probs,
        )
        forget_p = bootstrap_p_value(
            forget_logloss_delta,
            rng=None,
            samples=None,
        )

        member_conf = pre_forget_probs
        non_member_conf = model.predict_proba(holdout_split.features)[:, 1]
        pre_auc = membership_inference_auc(member_conf, non_member_conf)

        post_member_conf = post_forget_probs
        post_non_member_conf = np.mean(
            [m.predict_proba(holdout_split.features)[:, 1] for m in post_models],
            axis=0,
        )
        post_auc = membership_inference_auc(post_member_conf, post_non_member_conf)

        pre_holdout_acc = accuracy(
            holdout_split.labels,
            model.predict(holdout_split.features),
        )
        post_holdout_acc = accuracy(
            holdout_split.labels,
            (post_non_member_conf >= 0.5).astype(int),
        )

        result = EvaluationResult(
            pre_forget_accuracy=pre_forget_acc,
            post_forget_accuracy=post_forget_acc,
            forget_accuracy_drop=pre_forget_acc - post_forget_acc,
            forget_significance_p=forget_p,
            pre_membership_auc=pre_auc,
            post_membership_auc=post_auc,
            membership_auc_drop=pre_auc - post_auc,
            pre_holdout_accuracy=pre_holdout_acc,
            post_holdout_accuracy=post_holdout_acc,
            holdout_accuracy_delta=post_holdout_acc - pre_holdout_acc,
            seeds=seeds,
        )
        return result

    def build_report(self, result: EvaluationResult) -> EvaluationReport:
        return EvaluationReport(result)
