import pandas as pd

from tools.cfsv import CFSValidator


def build_base_frame():
    timestamps = pd.date_range("2024-01-01", periods=8, freq="h")
    label_times = timestamps + pd.Timedelta(hours=1)
    treatment_times = timestamps - pd.Timedelta(minutes=30)
    frame = pd.DataFrame(
        {
            "event_time": timestamps,
            "label_time": label_times,
            "label": [0, 1, 0, 1, 0, 1, 0, 1],
            "treatment": [0, 1, 0, 1, 0, 1, 0, 1],
            "treatment_time": treatment_times,
        }
    )
    return frame


def test_detects_label_and_temporal_leakage():
    frame = build_base_frame()
    frame["label_mirror"] = frame["label"]
    frame["future_feature"] = frame["label"].rolling(2, min_periods=1).mean()
    frame["future_feature_time"] = frame["label_time"] + pd.Timedelta(minutes=5)

    validator = CFSValidator(
        label_column="label",
        timestamp_column="event_time",
        label_time_column="label_time",
        treatment_columns=["treatment"],
        treatment_time_column="treatment_time",
        seed=2024,
    )

    report = validator.scan(
        frame,
        feature_timestamps={"future_feature": "future_feature_time"},
        train_fraction=0.6,
    )

    issue_types = {issue.type for issue in report.issues}
    assert "label_leakage" in issue_types
    assert "temporal_misalignment" in issue_types
    assert report.leakage_score > 0
    assert report.metadata["seed"] == 2024


def test_flags_post_treatment_and_backdoor_paths():
    frame = build_base_frame()
    frame["confounder"] = frame["treatment"] * 0.7 + frame["label"] * 0.3
    frame["confounder_time"] = frame["event_time"]
    frame["post_treatment_signal"] = frame["treatment"] * 2 + 0.1
    frame["post_treatment_signal_time"] = frame["label_time"] + pd.Timedelta(minutes=10)

    validator = CFSValidator(
        label_column="label",
        timestamp_column="event_time",
        label_time_column="label_time",
        treatment_columns=["treatment"],
        treatment_time_column="treatment_time",
        seed=7,
        post_treatment_threshold=0.8,
        confounding_threshold=0.4,
    )

    report = validator.scan(
        frame,
        feature_timestamps={
            "confounder": "confounder_time",
            "post_treatment_signal": "post_treatment_signal_time",
        },
        train_fraction=0.5,
    )

    issue_types = {issue.type for issue in report.issues}
    assert "post_treatment_leakage" in issue_types
    assert "backdoor_path" in issue_types


def test_time_split_violation_is_detected_and_report_is_deterministic():
    frame = build_base_frame()
    # Duplicate timestamps so that train and validation windows overlap.
    frame.loc[4, "event_time"] = frame.loc[3, "event_time"]
    frame["diagnostic_feature"] = frame["label"] + 0.01

    validator = CFSValidator(
        label_column="label",
        timestamp_column="event_time",
        label_time_column="label_time",
        seed=11,
    )

    first_report = validator.scan(frame, train_fraction=0.5)
    second_report = validator.scan(frame, train_fraction=0.5)

    time_split_issues = [issue for issue in first_report.issues if issue.type == "time_split_violation"]
    assert time_split_issues, "Expected time split violation to be surfaced"
    assert first_report.to_dict() == second_report.to_dict()
