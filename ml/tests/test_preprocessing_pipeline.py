from __future__ import annotations

import pandas as pd
import pytest

dask = pytest.importorskip("dask.dataframe")

from ml.app.pipelines import PostgresPreprocessingPipeline


def build_pipeline(df: pd.DataFrame) -> PostgresPreprocessingPipeline:
    return PostgresPreprocessingPipeline(
        connection_uri="postgresql://test", data_loader=lambda: dask.from_pandas(df, npartitions=2)
    )


def test_pipeline_runs_end_to_end() -> None:
    df = pd.DataFrame(
        {
            "id": [1, 2, 3, 4],
            "tenantId": ["t1", "t1", "t2", "t2"],
            "value_a": [10.0, 12.0, 13.0, 17.0],
            "value_b": [5.0, 6.0, 7.5, 8.0],
        }
    )
    pipeline = build_pipeline(df)
    result = pipeline.run()

    computed = result.dataframe.compute()
    assert {"feature_sum", "feature_mean", "feature_std", "feature_l2_norm"} <= set(computed.columns)
    assert "anomaly_flag" in computed.columns
    assert "anomaly_score" in computed.columns

    # Normalisation should produce zero mean for numeric columns (approximately)
    for column in ["value_a", "value_b"]:
        assert abs(computed[column].mean()) < 1e-6

    insights = result.quality_insights
    assert "timingsMs" in insights and insights["timingsMs"]
    assert insights["anomalySummary"]["total"] == len(df)
    assert insights["anomalySummary"]["anomalies"] >= 0


def test_pipeline_handles_empty_numeric_columns() -> None:
    df = pd.DataFrame(
        {
            "id": [1, 2],
            "tenantId": ["t1", "t1"],
        }
    )
    pipeline = build_pipeline(df)
    result = pipeline.run()
    computed = result.dataframe.compute()
    assert "anomaly_flag" not in computed.columns  # no numeric data
    insights = result.quality_insights
    assert insights["anomalySummary"]["total"] == len(df)
    assert insights["anomalySummary"]["anomalies"] == 0
    assert insights["featureStats"] == {}
