from __future__ import annotations

import json
from pathlib import Path

from ppeg.codegen import PipelineGenerator
from ppeg.spec import SpecLoader


def test_generate_pipeline(tmp_path: Path) -> None:
    spec_path = Path(__file__).parent / "fixtures" / "sample_etl.yaml"
    loader = SpecLoader()
    loaded = loader.load(spec_path)

    generator = PipelineGenerator(loaded)
    pipeline_path = generator.generate(tmp_path)

    assert pipeline_path.exists()

    manifest_path = tmp_path / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest["pipeline"]["name"] == "sample_sales_pipeline"
    assert manifest["pipeline"]["policy_version"] == "policy-v1.0"
    assert manifest["pipeline"]["fingerprint"]

    sql_path = tmp_path / "sql" / "compute_regional_totals.sql"
    assert "GROUP BY region" in sql_path.read_text(encoding="utf-8")

    readme_contents = (tmp_path / "README.md").read_text(encoding="utf-8")
    assert "python pipeline.py" in readme_contents
