from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from ppeg.codegen import PipelineGenerator
from ppeg.spec import SpecLoader


def test_generated_pipeline_runs_with_provenance(tmp_path: Path) -> None:
    spec_path = Path(__file__).parent / "fixtures" / "sample_etl.yaml"
    loader = SpecLoader()
    loaded = loader.load(spec_path)

    generator = PipelineGenerator(loaded)
    output_dir = tmp_path / "generated"
    generator.generate(output_dir)

    subprocess.run([sys.executable, "pipeline.py"], cwd=output_dir, check=True)

    produced = output_dir / "outputs" / "regional_totals.csv"
    expected = Path(__file__).parent / "golden" / "regional_totals.csv"
    assert produced.read_text(encoding="utf-8") == expected.read_text(encoding="utf-8")

    provenance_path = output_dir / "outputs" / "provenance.json"
    provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
    assert len(provenance) == 3  # 1 source + 2 steps

    for entry in provenance:
        assert entry["policy_version"] == "policy-v1.0"
        assert entry["outputs"]
        for dataset_info in entry["outputs"].values():
            assert dataset_info["fingerprint"]

    attestation_path = output_dir / "outputs" / "attestations.json"
    attestations = json.loads(attestation_path.read_text(encoding="utf-8"))
    assert len(attestations) >= len(provenance)

    sink_entry = next(entry for entry in provenance if entry["step_id"] == "attach_policy_version")
    sink_outputs = sink_entry["outputs"]["regional_totals"]
    assert sink_outputs["materialized_at"].endswith("outputs/regional_totals.csv")
