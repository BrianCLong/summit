import pytest
import pandas as pd
from summit.integrations.palantir_foundry_engine import TransformRunner, Transform

def test_dag_resolution():
    runner = TransformRunner()

    # Raw Data
    df_raw = pd.DataFrame({"id": [1, 2], "val": ["a", "b"]})
    runner.register_dataset("ri.raw", df_raw)

    # Clean Transform (Python)
    def clean_logic(inputs):
        df = inputs["ri.raw"]
        df["val"] = df["val"].str.upper()
        return df

    t_clean = Transform(
        output_rid="ri.clean",
        input_rids=["ri.raw"],
        logic=clean_logic
    )
    runner.register_transform(t_clean)

    # Agg Transform (SQL)
    def agg_logic(inputs):
        # We assume the wrapper handles the SQL execution,
        # but here we mock the logic for simplicity or use the wrapper if we want integration test
        # Let's use the wrapper pattern manually or just pure pandas for this unit test
        df = inputs["ri.clean"]
        return df.groupby("val").count().reset_index()

    t_agg = Transform(
        output_rid="ri.agg",
        input_rids=["ri.clean"],
        logic=agg_logic
    )
    runner.register_transform(t_agg)

    # Build Leaf
    status = runner.build(["ri.agg"])

    assert status["ri.agg"] == "SUCCESS"
    assert "ri.clean" in runner.datasets

    # Verify Data
    df_clean = runner.datasets["ri.clean"]
    assert df_clean.iloc[0]["val"] == "A"

def test_incremental_flag():
    runner = TransformRunner()
    runner.register_dataset("ri.raw", pd.DataFrame())

    t = Transform("ri.out", ["ri.raw"], lambda x: x["ri.raw"])
    runner.register_transform(t)

    # First build
    runner.build(["ri.out"], incremental=False)
    assert "ri.out" in runner.snapshots

    # Second build (incremental)
    # We capture stdout/logs in real test, here we just ensure it runs
    runner.build(["ri.out"], incremental=True)
