import importlib.util
import sys
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "assets_csv", Path("data-pipelines/universal-ingest/assets_csv.py")
)
assets_csv = importlib.util.module_from_spec(spec)
sys.modules["assets_csv"] = assets_csv
spec.loader.exec_module(assets_csv)
load_assets_csv = assets_csv.load_assets_csv


def test_load_assets_csv_creates_nodes_and_edges():
    path = Path("tests/fixtures/ingest/assets.csv")
    graph = load_assets_csv(path, "ACME")
    # Two assets + one org node
    assert len(graph["nodes"]) == 3
    assert any(n["type"] == "Asset" and n["name"] == "web01" for n in graph["nodes"])
    # Two edges linking org to assets
    assert len(graph["edges"]) == 2
