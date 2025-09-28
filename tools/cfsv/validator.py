"""Core validation logic for the Causal Feature Store Validator."""

from __future__ import annotations

from typing import Dict, Iterable, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd

from .report import CFSVIssue, CFSVReport


class CFSValidator:
    """Analyse feature stores for label leakage and causal contamination."""

    _SEVERITY_ORDER = {"high": 0, "medium": 1, "low": 2}

    def __init__(
        self,
        *,
        label_column: str,
        timestamp_column: str,
        label_time_column: Optional[str] = None,
        treatment_columns: Optional[Sequence[str]] = None,
        treatment_time_column: Optional[str] = None,
        correlation_threshold: float = 0.98,
        post_treatment_threshold: float = 0.85,
        confounding_threshold: float = 0.6,
        seed: int = 42,
    ) -> None:
        self.label_column = label_column
        self.timestamp_column = timestamp_column
        self.label_time_column = label_time_column
        self.treatment_columns = list(treatment_columns or [])
        self.treatment_time_column = treatment_time_column
        self.correlation_threshold = correlation_threshold
        self.post_treatment_threshold = post_treatment_threshold
        self.confounding_threshold = confounding_threshold
        self.seed = seed
        self.random_state = np.random.RandomState(seed)

    def scan(
        self,
        frame: pd.DataFrame,
        *,
        feature_timestamps: Optional[Dict[str, str]] = None,
        train_fraction: float = 0.7,
    ) -> CFSVReport:
        """Execute the full validation suite and return a deterministic report."""

        self._validate_inputs(frame, train_fraction)
        feature_timestamps = feature_timestamps or {}

        reserved_columns = {
            self.label_column,
            self.timestamp_column,
        }
        if self.label_time_column:
            reserved_columns.add(self.label_time_column)
        if self.treatment_time_column:
            reserved_columns.add(self.treatment_time_column)
        reserved_columns.update(self.treatment_columns)

        features = [
            column
            for column in frame.columns
            if column not in reserved_columns and pd.api.types.is_numeric_dtype(frame[column])
        ]

        issues: List[CFSVIssue] = []
        issues.extend(
            self._check_temporal_alignment(frame, features, feature_timestamps)
        )
        issues.extend(self._check_label_leakage(frame, features))
        issues.extend(
            self._check_post_treatment_leakage(frame, features, feature_timestamps)
        )
        issues.extend(self._check_backdoor_paths(frame, features))
        time_split_metadata, time_split_issue = self._check_time_split(frame, train_fraction)
        if time_split_issue is not None:
            issues.append(time_split_issue)

        issues = self._deduplicate_and_sort_issues(issues)
        leakage_score = self._compute_leakage_score(issues, len(features))

        metadata = {
            "seed": self.seed,
            "parameters": {
                "label_column": self.label_column,
                "timestamp_column": self.timestamp_column,
                "label_time_column": self.label_time_column,
                "treatment_columns": tuple(self.treatment_columns),
                "treatment_time_column": self.treatment_time_column,
                "correlation_threshold": self.correlation_threshold,
                "post_treatment_threshold": self.post_treatment_threshold,
                "confounding_threshold": self.confounding_threshold,
            },
            "time_split": time_split_metadata,
        }

        return CFSVReport(leakage_score=leakage_score, issues=issues, metadata=metadata)

    def _validate_inputs(self, frame: pd.DataFrame, train_fraction: float) -> None:
        if self.label_column not in frame.columns:
            raise ValueError(f"Label column '{self.label_column}' missing from frame")
        if self.timestamp_column not in frame.columns:
            raise ValueError(
                f"Timestamp column '{self.timestamp_column}' missing from frame"
            )
        if not 0.0 < train_fraction < 1.0:
            raise ValueError("train_fraction must be between 0 and 1 (exclusive)")

    def _check_temporal_alignment(
        self,
        frame: pd.DataFrame,
        features: Sequence[str],
        feature_timestamps: Dict[str, str],
    ) -> List[CFSVIssue]:
        if not self.label_time_column:
            return []

        issues: List[CFSVIssue] = []
        for feature in features:
            ts_column = feature_timestamps.get(feature, self.timestamp_column)
            if ts_column not in frame.columns:
                issues.append(
                    CFSVIssue(
                        type="temporal_misalignment",
                        feature=feature,
                        severity="medium",
                        description=(
                            f"Timestamp column '{ts_column}' for feature '{feature}' is missing."
                        ),
                        suggestions=[
                            "Ensure feature timestamps are materialised before validation.",
                            "Provide an explicit feature_timestamps mapping for derived features.",
                        ],
                    )
                )
                continue

            misaligned = frame[ts_column] > frame[self.label_time_column]
            if misaligned.any():
                violation_rate = float(misaligned.mean())
                issues.append(
                    CFSVIssue(
                        type="temporal_misalignment",
                        feature=feature,
                        severity="high" if violation_rate > 0.05 else "medium",
                        description=(
                            f"{misaligned.sum()} rows for feature '{feature}' occur after the label timestamp."
                        ),
                        suggestions=[
                            "Lag or truncate the feature to respect the prediction horizon.",
                            "Recompute the feature using only data available before the label time.",
                        ],
                    )
                )

        return issues

    def _check_label_leakage(
        self, frame: pd.DataFrame, features: Sequence[str]
    ) -> List[CFSVIssue]:
        label_series = frame[self.label_column]
        issues: List[CFSVIssue] = []
        for feature in features:
            feature_series = frame[feature]
            if feature_series.equals(label_series):
                issues.append(
                    CFSVIssue(
                        type="label_leakage",
                        feature=feature,
                        severity="high",
                        description=(
                            f"Feature '{feature}' is identical to the label column."
                        ),
                        suggestions=[
                            "Exclude replicated labels from the training feature set.",
                        ],
                    )
                )
                continue

            if feature_series.isna().all():
                continue

            correlation = float(label_series.corr(feature_series))
            if np.isnan(correlation):
                continue
            if abs(correlation) >= self.correlation_threshold:
                issues.append(
                    CFSVIssue(
                        type="label_leakage",
                        feature=feature,
                        severity="high",
                        description=(
                            f"Feature '{feature}' correlates with the label at {correlation:.3f}."
                        ),
                        suggestions=[
                            "Audit the feature derivation to ensure it does not use outcome information.",
                            "Delay aggregation windows or drop the feature entirely.",
                        ],
                    )
                )

        return issues

    def _check_post_treatment_leakage(
        self,
        frame: pd.DataFrame,
        features: Sequence[str],
        feature_timestamps: Dict[str, str],
    ) -> List[CFSVIssue]:
        if not self.treatment_columns:
            return []

        issues: List[CFSVIssue] = []
        treatment_time_series = (
            frame[self.treatment_time_column]
            if self.treatment_time_column and self.treatment_time_column in frame.columns
            else None
        )

        for feature in features:
            ts_column = feature_timestamps.get(feature, self.timestamp_column)
            ts_series = frame[ts_column] if ts_column in frame.columns else None
            for treatment_column in self.treatment_columns:
                if treatment_column not in frame.columns:
                    continue
                corr = frame[feature].corr(frame[treatment_column])
                if pd.isna(corr) or abs(corr) < self.post_treatment_threshold:
                    continue

                if treatment_time_series is not None and ts_series is not None:
                    mask = ts_series >= treatment_time_series
                else:
                    mask = pd.Series(True, index=frame.index)

                if mask.any():
                    violation_rate = float(mask.mean())
                    issues.append(
                        CFSVIssue(
                            type="post_treatment_leakage",
                            feature=feature,
                            severity="high" if violation_rate > 0.1 else "medium",
                            description=(
                                "Feature '{feature}' is correlated with treatment '{treatment}' "
                                "and observed after treatment timing for {count} rows."
                            ).format(
                                feature=feature,
                                treatment=treatment_column,
                                count=int(mask.sum()),
                            ),
                            suggestions=[
                                "Generate the feature from pre-treatment signals only.",
                                "Consider modelling the treatment effect explicitly instead of leaking outcomes.",
                            ],
                        )
                    )

        return issues

    def _check_backdoor_paths(
        self, frame: pd.DataFrame, features: Sequence[str]
    ) -> List[CFSVIssue]:
        if not self.treatment_columns:
            return []

        label_series = frame[self.label_column]
        issues: List[CFSVIssue] = []
        for feature in features:
            feature_series = frame[feature]
            label_corr = label_series.corr(feature_series)
            if pd.isna(label_corr) or abs(label_corr) < self.confounding_threshold:
                continue

            for treatment_column in self.treatment_columns:
                if treatment_column not in frame.columns:
                    continue
                treatment_corr = feature_series.corr(frame[treatment_column])
                if pd.isna(treatment_corr) or abs(treatment_corr) < self.confounding_threshold:
                    continue

                issues.append(
                    CFSVIssue(
                        type="backdoor_path",
                        feature=feature,
                        severity="medium",
                        description=(
                            "Feature '{feature}' is strongly associated with both the treatment and label "
                            "(corr_label={corr_label:.3f}, corr_treatment={corr_treat:.3f})."
                        ).format(
                            feature=feature,
                            corr_label=float(label_corr),
                            corr_treat=float(treatment_corr),
                        ),
                        suggestions=[
                            "Control for the feature as a confounder or block the backdoor path via adjustment.",
                            "Investigate whether the feature embeds downstream treatment effects.",
                        ],
                    )
                )
                break

        return issues

    def _check_time_split(
        self, frame: pd.DataFrame, train_fraction: float
    ) -> Tuple[Dict[str, float], Optional[CFSVIssue]]:
        sorted_frame = frame.sort_values(self.timestamp_column, kind="mergesort")
        split_index = int(len(sorted_frame) * train_fraction)
        split_index = max(1, min(split_index, len(sorted_frame) - 1))
        train_end = sorted_frame.iloc[:split_index][self.timestamp_column].max()
        validation_start = sorted_frame.iloc[split_index:][self.timestamp_column].min()

        passed = train_end < validation_start
        metadata = {
            "train_fraction": float(train_fraction),
            "train_end": train_end,
            "validation_start": validation_start,
            "passed": bool(passed),
        }

        if passed:
            return metadata, None

        issue = CFSVIssue(
            type="time_split_violation",
            feature=None,
            severity="high",
            description=(
                "Training window (<= {train_end}) overlaps with validation window (>= {validation_start})."
            ).format(train_end=train_end, validation_start=validation_start),
            suggestions=[
                "Recreate train/validation splits with non-overlapping temporal boundaries.",
                "Use a strict time-based split to avoid look-ahead bias.",
            ],
        )
        return metadata, issue

    def _compute_leakage_score(self, issues: Sequence[CFSVIssue], feature_count: int) -> float:
        if not issues:
            return 0.0
        severity_weights = {"high": 1.0, "medium": 0.6, "low": 0.3}
        total_weight = sum(severity_weights.get(issue.severity, 0.3) for issue in issues)
        normaliser = max(feature_count, 1)
        score = min(1.0, total_weight / normaliser)
        return round(score, 4)

    def _deduplicate_and_sort_issues(self, issues: Iterable[CFSVIssue]) -> List[CFSVIssue]:
        seen = {}
        for issue in issues:
            key = (issue.type, issue.feature, issue.description)
            if key not in seen:
                seen[key] = issue
        unique = list(seen.values())
        unique.sort(
            key=lambda issue: (
                self._SEVERITY_ORDER.get(issue.severity, 3),
                issue.type,
                issue.feature or "",
            )
        )
        return unique
