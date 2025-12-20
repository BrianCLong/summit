"""Core evaluation routines for the Counterfactual Evaluation Harness."""
from __future__ import annotations

import json
import math
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional

import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.linear_model import LinearRegression
from sklearn.metrics import accuracy_score, log_loss
from sklearn.model_selection import train_test_split

from .datasets import CEHDataset


@dataclass
class EvaluationArtifacts:
    """Convenience wrapper for CEH evaluation outputs."""

    baseline_predictions: np.ndarray
    feature_ablation: List[Dict[str, Any]]
    partial_correlations: List[Dict[str, Any]]
    spurious_correlations: Dict[str, Any]
    backdoor_adjustment: Optional[Dict[str, Any]]
    uplift: Optional[Dict[str, Any]]
    irm_result: Optional[Dict[str, Any]]


class CounterfactualEvaluationHarness:
    """Run counterfactual diagnostics against tabular models."""

    def __init__(
        self,
        model,
        dataset: CEHDataset,
        *,
        random_state: int = 0,
        test_size: float = 0.3,
    ) -> None:
        self.model_template = model
        self.dataset = dataset
        self.random_state = random_state
        self.test_size = test_size

        self._is_fit = False
        self.model_ = None
        self.model_irm_ = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def fit(self) -> None:
        """Fit the base model on the dataset."""

        X = self.dataset.data
        y = self.dataset.target

        indices = np.arange(len(X))
        stratify = y if len(np.unique(y)) > 1 else None
        train_idx, test_idx = train_test_split(
            indices,
            test_size=self.test_size,
            random_state=self.random_state,
            stratify=stratify,
        )

        self.X_train = X.iloc[train_idx].reset_index(drop=True)
        self.X_test = X.iloc[test_idx].reset_index(drop=True)
        self.y_train = y.iloc[train_idx].reset_index(drop=True)
        self.y_test = y.iloc[test_idx].reset_index(drop=True)

        if self.dataset.environments is not None:
            env = self.dataset.environments
            self.env_train = env.iloc[train_idx].reset_index(drop=True)
            self.env_test = env.iloc[test_idx].reset_index(drop=True)
        else:
            self.env_train = self.env_test = None

        self.model_ = clone(self.model_template)
        self.model_.fit(self.X_train, self.y_train)

        self.baseline_train_preds_ = self._predict_proba(self.model_, self.X_train)
        self.baseline_test_preds_ = self._predict_proba(self.model_, self.X_test)
        self._is_fit = True

    def run_full_evaluation(self, lambda_irm: float = 1.0) -> Dict[str, Any]:
        """Execute the entire CEH suite and return a report."""

        if not self._is_fit:
            self.fit()

        ablation = self._feature_ablation(self.model_, self.X_test, self.baseline_test_preds_)
        partial = self._partial_correlations(self.X_train, self.y_train)
        spurious = self._detect_spurious_correlations(ablation, partial)
        backdoor = self._causal_backdoor_adjustment(self.model_)
        uplift = self._uplift_analysis(self.model_)
        irm_result = self._apply_irm_penalty(lambda_irm=lambda_irm)

        baseline_accuracy = accuracy_score(self.y_test, self.baseline_test_preds_ >= 0.5)
        baseline_sensitivity = float(
            np.mean([row["sensitivity"] for row in ablation]) if ablation else 0.0
        )

        guardrails: List[Dict[str, Any]] = []
        if spurious["detected_features"]:
            guardrails.append(
                {
                    "type": "feature_monitoring",
                    "recommendation": "Monitor or remove high-spurious-score features",
                    "features": [row["feature"] for row in spurious["detected_features"]],
                }
            )
        if irm_result is not None:
            guardrails.append(
                {
                    "type": "irm_reweighting",
                    "recommendation": "Enable IRM-style environment reweighting during retraining",
                    "lambda": lambda_irm,
                    "penalty": irm_result["penalty"],
                }
            )

        report = {
            "dataset": {
                "name": self.dataset.name,
                "description": self.dataset.description,
                "size": int(len(self.dataset.data)),
                "features": list(self.dataset.data.columns),
                "confounders": list(self.dataset.confounders),
                "treatment": self.dataset.treatment,
            },
            "model": type(self.model_template).__name__,
            "metrics": {
                "baseline": {
                    "accuracy": float(baseline_accuracy),
                    "counterfactual_sensitivity": baseline_sensitivity,
                }
            },
            "spurious_correlations": spurious,
            "feature_ablation": ablation,
            "partial_correlations": partial,
            "backdoor_adjustment": backdoor,
            "uplift": uplift,
            "guardrails": guardrails,
            "random_state": self.random_state,
        }

        if irm_result is not None:
            report["metrics"]["irm"] = {
                "accuracy": irm_result["accuracy"],
                "counterfactual_sensitivity": irm_result["counterfactual_sensitivity"],
            }
            report["irm"] = irm_result

        return report

    def save_report(self, path: str, lambda_irm: float = 1.0) -> None:
        """Persist the evaluation report to disk."""

        report = self.run_full_evaluation(lambda_irm=lambda_irm)
        with open(path, "w", encoding="utf-8") as stream:
            json.dump(report, stream, indent=2)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _predict_proba(self, model, X: pd.DataFrame) -> np.ndarray:
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(X)
            if proba.ndim == 2:
                return proba[:, -1]
            return proba
        if hasattr(model, "decision_function"):
            decision = model.decision_function(X)
            return 1 / (1 + np.exp(-decision))
        preds = model.predict(X)
        return np.asarray(preds, dtype=float)

    def _feature_ablation(
        self,
        model,
        X: pd.DataFrame,
        baseline: np.ndarray,
    ) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        for column in X.columns:
            ablated = X.copy()
            ablated[column] = X[column].mean()
            preds = self._predict_proba(model, ablated)
            sensitivity = float(np.abs(preds - baseline).mean())
            results.append(
                {
                    "feature": column,
                    "sensitivity": sensitivity,
                    "baseline_value": float(X[column].mean()),
                }
            )
        results.sort(key=lambda row: row["sensitivity"], reverse=True)
        return results

    def _partial_correlations(
        self,
        X: pd.DataFrame,
        y: pd.Series,
    ) -> List[Dict[str, Any]]:
        confounders = [c for c in self.dataset.confounders if c in X.columns]
        results: List[Dict[str, Any]] = []

        if not confounders:
            # With no confounders, return absolute correlation values.
            for column in X.columns:
                corr_matrix = np.corrcoef(X[column], y)
                corr = float(np.nan_to_num(corr_matrix[0, 1], nan=0.0))
                results.append(
                    {
                        "feature": column,
                        "partial_correlation": float(abs(corr)),
                    }
                )
            return results

        conf_matrix = X[confounders]
        y_reg = LinearRegression().fit(conf_matrix, y)
        y_resid = y - y_reg.predict(conf_matrix)

        for column in X.columns:
            feat_reg = LinearRegression().fit(conf_matrix, X[column])
            feat_resid = X[column] - feat_reg.predict(conf_matrix)
            corr_matrix = np.corrcoef(feat_resid, y_resid)
            corr = float(np.nan_to_num(corr_matrix[0, 1], nan=0.0))
            results.append(
                {
                    "feature": column,
                    "partial_correlation": float(abs(corr)),
                }
            )
        return results

    def _detect_spurious_correlations(
        self,
        ablation: Iterable[Dict[str, Any]],
        partials: Iterable[Dict[str, Any]],
    ) -> Dict[str, Any]:
        partial_lookup = {row["feature"]: row["partial_correlation"] for row in partials}

        records: List[Dict[str, Any]] = []
        for row in ablation:
            feature = row["feature"]
            partial_corr = partial_lookup.get(feature, 0.0)
            score = max(row["sensitivity"] - float(partial_corr), 0.0)
            records.append(
                {
                    "feature": feature,
                    "sensitivity": row["sensitivity"],
                    "partial_correlation": float(partial_corr),
                    "spurious_score": float(score),
                }
            )

        records.sort(key=lambda item: item["spurious_score"], reverse=True)
        scores = [item["spurious_score"] for item in records]
        threshold = float(np.percentile(scores, 75)) if scores else 0.0
        detected = [
            item
            for item in records
            if item["spurious_score"] >= threshold and item["partial_correlation"] < 0.1
        ]
        return {
            "ranked_features": records,
            "detected_features": detected,
            "threshold": threshold,
        }

    def _causal_backdoor_adjustment(self, model) -> Optional[Dict[str, Any]]:
        treatment = self.dataset.treatment
        confounders = [c for c in self.dataset.confounders if c in self.X_test.columns]
        if treatment is None or not confounders:
            return None

        X = self.X_test
        y = self.y_test

        preds_treat = self._predict_with_modified_feature(model, X, treatment, 1)
        preds_ctrl = self._predict_with_modified_feature(model, X, treatment, 0)

        groups = X.groupby(confounders, observed=True)
        ate_pred = 0.0
        ate_actual = 0.0
        total_weight = 0.0
        for _, group in groups:
            idx = group.index
            weight = len(idx) / len(X)
            total_weight += weight
            idx_array = np.asarray(idx)
            ate_pred += weight * (preds_treat[idx_array].mean() - preds_ctrl[idx_array].mean())

            treat_mask = group[treatment] == 1
            control_mask = group[treatment] == 0
            if treat_mask.any() and control_mask.any():
                actual = y.loc[idx].to_numpy()
                treat_flags = treat_mask.to_numpy(dtype=bool)
                control_flags = control_mask.to_numpy(dtype=bool)
                ate_actual += weight * (
                    actual[treat_flags].mean() - actual[control_flags].mean()
                )

        if total_weight == 0:  # pragma: no cover - defensive
            return None

        return {
            "adjusted_ate_prediction": float(ate_pred / total_weight),
            "adjusted_ate_observed": float(ate_actual / total_weight),
            "gap": float((ate_pred - ate_actual) / total_weight),
        }

    def _uplift_analysis(self, model) -> Optional[Dict[str, Any]]:
        treatment = self.dataset.treatment
        if treatment is None or treatment not in self.X_test.columns:
            return None

        X = self.X_test
        y = self.y_test
        preds = self.baseline_test_preds_

        treat_mask = X[treatment] == 1
        control_mask = X[treatment] == 0

        if not treat_mask.any() or not control_mask.any():  # pragma: no cover - defensive
            return None

        treat_flags = treat_mask.to_numpy(dtype=bool)
        control_flags = control_mask.to_numpy(dtype=bool)

        actual_uplift = float(y[treat_mask].mean() - y[control_mask].mean())
        model_uplift = float(preds[treat_flags].mean() - preds[control_flags].mean())

        counterfactual_treat = self._predict_with_modified_feature(model, X, treatment, 1)
        counterfactual_ctrl = self._predict_with_modified_feature(model, X, treatment, 0)
        counterfactual_uplift = float(
            counterfactual_treat.mean() - counterfactual_ctrl.mean()
        )

        return {
            "observed_uplift": actual_uplift,
            "predicted_uplift": model_uplift,
            "counterfactual_uplift": counterfactual_uplift,
            "uplift_gap": float(model_uplift - actual_uplift),
        }

    def _predict_with_modified_feature(
        self,
        model,
        X: pd.DataFrame,
        feature: str,
        value: float,
    ) -> np.ndarray:
        modified = X.copy()
        modified[feature] = value
        return self._predict_proba(model, modified)

    def _compute_environment_risks(
        self,
        model,
        X: pd.DataFrame,
        y: pd.Series,
        environments: pd.Series,
    ) -> Dict[str, float]:
        env_risks: Dict[str, float] = {}
        unique_envs = environments.unique()
        for env in unique_envs:
            mask = environments == env
            if mask.sum() < 5:
                continue
            preds = self._predict_proba(model, X.loc[mask])
            env_risks[str(env)] = float(log_loss(y.loc[mask], preds, labels=[0, 1]))
        return env_risks

    def _apply_irm_penalty(self, lambda_irm: float) -> Optional[Dict[str, Any]]:
        if self.env_train is None:
            return None

        baseline_risks = self._compute_environment_risks(
            self.model_, self.X_train, self.y_train, self.env_train
        )
        if not baseline_risks:
            return None

        mean_risk = float(np.mean(list(baseline_risks.values())))
        baseline_penalty = float(np.var(list(baseline_risks.values())))

        env_counts = self.env_train.value_counts()

        def _base_weight(env_value: Any) -> float:
            return 1.0 / float(env_counts[env_value])

        base_weights = self.env_train.map(_base_weight)
        risk_ratio = self.env_train.map(
            lambda env: baseline_risks[str(env)] / (mean_risk + 1e-8)
        )
        weights = base_weights * np.power(risk_ratio, lambda_irm)
        weights = weights / weights.mean()
        weights = weights.clip(lower=0.1, upper=25.0)

        confounders = [c for c in self.dataset.confounders if c in self.X_train.columns]
        if confounders:
            X_train_adj = self.X_train.copy()
            X_test_adj = self.X_test.copy()
            for column in confounders:
                neutral = float(self.X_train[column].mean())
                X_train_adj[column] = neutral
                X_test_adj[column] = neutral
        else:
            X_train_adj = self.X_train
            X_test_adj = self.X_test

        model_irm = clone(self.model_template)
        model_irm.fit(X_train_adj, self.y_train, sample_weight=weights)
        irm_preds_test = self._predict_proba(model_irm, X_test_adj)
        irm_accuracy = float(accuracy_score(self.y_test, irm_preds_test >= 0.5))

        irm_ablation = self._feature_ablation(model_irm, X_test_adj, irm_preds_test)
        irm_sensitivity = float(
            np.mean([row["sensitivity"] for row in irm_ablation]) if irm_ablation else 0.0
        )

        irm_risks = self._compute_environment_risks(
            model_irm, X_train_adj, self.y_train, self.env_train
        )
        irm_penalty = float(np.var(list(irm_risks.values()))) if irm_risks else 0.0

        self.model_irm_ = model_irm

        return {
            "weights": weights.tolist(),
            "penalty": baseline_penalty,
            "penalty_after": irm_penalty,
            "environment_risks": baseline_risks,
            "environment_risks_after": irm_risks,
            "accuracy": irm_accuracy,
            "counterfactual_sensitivity": irm_sensitivity,
            "confounders_neutralized": {
                column: float(self.X_train[column].mean()) for column in confounders
            },
            "feature_ablation": irm_ablation,
        }


__all__ = ["CounterfactualEvaluationHarness", "EvaluationArtifacts"]
