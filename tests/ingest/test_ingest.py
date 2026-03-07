import importlib.util
import json
import sys
from dataclasses import asdict
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "ingest", Path("data-pipelines/universal-ingest/ingest.py")
)
ingest = importlib.util.module_from_spec(spec)
sys.modules["ingest"] = ingest
spec.loader.exec_module(ingest)

IngestionPipeline = ingest.IngestionPipeline
parse_csv = ingest.parse_csv
replay_dlq = ingest.replay_dlq


class MemoryLoader:
    def __init__(self, dlq_path: Path, fail_names=None):
        self.records = set()
        self.dlq_path = dlq_path
        self.fail_names = set(fail_names or [])
        self.dlq_path.parent.mkdir(parents=True, exist_ok=True)

    def load(self, entities, relationships):
        upserts = 0
        dlq = 0
        for e in entities:
            if e.name in self.fail_names:
                with self.dlq_path.open("a", encoding="utf-8") as f:
                    f.write(json.dumps({"kind": "entity", "data": asdict(e)}) + "\n")
                dlq += 1
            else:
                if e.ingest_id not in self.records:
                    self.records.add(e.ingest_id)
                    upserts += 1
        return upserts, dlq


def build_pipeline(tmp_path: Path, fail_names=None):
    loader = MemoryLoader(tmp_path / "dlq.jsonl", fail_names=fail_names)
    pipeline = IngestionPipeline(loader)
    pipeline.register(".csv", parse_csv)
    return pipeline, loader


def test_idempotent_ingest(tmp_path: Path):
    pipeline, loader = build_pipeline(tmp_path)
    sample = Path("tests/fixtures/ingest/sample.csv")
    pipeline.ingest(sample, "OSINT")
    metrics = pipeline.ingest(sample, "OSINT")
    assert len(loader.records) == 2
    assert metrics["dedup"] > 0


def test_dlq_replay(tmp_path: Path):
    pipeline, _ = build_pipeline(tmp_path, fail_names={"FAIL"})
    fault = Path("tests/fixtures/ingest/fault.csv")
    metrics = pipeline.ingest(fault, "OSINT")
    assert metrics["dlq"] == 1

    # replay with clean loader
    pipeline.loader = MemoryLoader(tmp_path / "dlq.jsonl")
    replay_dlq(pipeline, tmp_path, rate_limit=0)
    assert len(pipeline.loader.records) == 1
    assert (tmp_path / "dlq.jsonl").read_text() == ""
