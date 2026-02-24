from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path

from .cost_model import cost_per_1k_tokens, estimate_cost_usd
from .latency_profiler import p95_latency_ms
from .robustness_suite import compute_robustness
from .scorer import score_model


DEFAULT_RUNTIME_BUDGET_SEC = 600.0
DEFAULT_COST_BUDGET_USD = 5.0
DEFAULT_MEMORY_BUDGET_MB = 2048


@dataclass(frozen=True)
class EvalConfig:
    schema_path: Path
    corpus_path: Path
    fixtures_path: Path
    out_dir: Path
    baseline_path: Path | None
    selected_models: list[str]
    max_regression: float
    expected_corpus_sha: str | None


def _canonical_json(payload: dict | list) -> str:
    return json.dumps(payload, indent=2, sort_keys=True) + "\n"


def _read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _read_jsonl(path: Path) -> list[dict[str, object]]:
    lines = [line for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    return [json.loads(line) for line in lines]


def _file_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def _evidence_id(model: str, metric: str, value: float) -> str:
    digest = hashlib.sha256(f"{model}:{metric}:{value:.6f}".encode("utf-8")).hexdigest()[:12]
    return f"EVIDENCE-LLM-VITALS-{_slug(model)}-{_slug(metric)}-{digest}"


def _validate_schema(schema: dict[str, dict[str, float | str]]) -> None:
    if not schema:
        raise ValueError("Vitals schema is empty")
    total = 0.0
    for metric_name, metric_spec in schema.items():
        for required_key in ("weight", "direction", "min", "max"):
            if required_key not in metric_spec:
                raise ValueError(f"Schema metric '{metric_name}' missing '{required_key}'")
        total += float(metric_spec["weight"])
    if round(total, 6) != 1.0:
        raise ValueError(f"Vitals weights must sum to 1.0, got {total}")


def _extract_model_key(provider_entry: dict[str, object]) -> str:
    return f"{provider_entry['provider']}:{provider_entry['model']}"


def _regression(
    baseline_value: float,
    current_value: float,
    direction: str,
) -> float:
    if baseline_value == 0.0:
        return 0.0
    if direction == "higher_is_better":
        return max(0.0, (baseline_value - current_value) / baseline_value)
    if direction == "lower_is_better":
        return max(0.0, (current_value - baseline_value) / baseline_value)
    raise ValueError(f"Unsupported direction {direction}")


def run_evaluation(config: EvalConfig) -> dict[str, object]:
    schema = _read_json(config.schema_path)
    _validate_schema(schema)
    corpus = sorted(_read_jsonl(config.corpus_path), key=lambda item: str(item["case_id"]))

    corpus_sha = _file_sha256(config.corpus_path)
    if config.expected_corpus_sha and corpus_sha != config.expected_corpus_sha:
        raise ValueError(
            "Corpus hash mismatch. "
            f"expected={config.expected_corpus_sha} actual={corpus_sha}"
        )

    fixtures = _read_json(config.fixtures_path)
    fixture_providers = fixtures.get("providers", [])
    if not isinstance(fixture_providers, list):
        raise ValueError("provider_fixtures.json must contain a providers array")

    selected = set(config.selected_models)
    providers: list[dict[str, object]] = []
    for provider_entry in fixture_providers:
        model_key = _extract_model_key(provider_entry)
        if selected and model_key not in selected and str(provider_entry["model"]) not in selected:
            continue
        providers.append(provider_entry)

    providers = sorted(providers, key=lambda item: _extract_model_key(item))
    if len(providers) < 2:
        raise ValueError("At least two models must be evaluated")

    per_model: list[dict[str, object]] = []
    total_estimated_cost = 0.0
    total_estimated_runtime_sec = 0.0

    for provider_entry in providers:
        provider = str(provider_entry["provider"])
        model = str(provider_entry["model"])
        model_key = f"{provider}:{model}"
        seed = provider_entry.get("seed")
        if not isinstance(seed, int):
            raise ValueError(f"Seed validation failed for {model_key}")

        response_list = provider_entry.get("responses", [])
        if not isinstance(response_list, list):
            raise ValueError(f"Responses for {model_key} must be a list")
        response_by_case = {str(item["case_id"]): item for item in response_list}

        latencies: list[float] = []
        total_cost = 0.0
        total_tokens = 0
        correct = 0
        safety_sum = 0.0
        reliability_hits = 0

        for case in corpus:
            case_id = str(case["case_id"])
            if case_id not in response_by_case:
                raise ValueError(f"Missing metrics for {model_key} case {case_id}")
            record = response_by_case[case_id]
            latency_ms = float(record["latency_ms"])
            input_tokens = int(record["input_tokens"])
            output_tokens = int(record["output_tokens"])

            latencies.append(latency_ms)
            total_tokens += input_tokens + output_tokens
            total_cost += estimate_cost_usd(model_key, input_tokens, output_tokens)
            correct += int(bool(record.get("correct", False)))
            safety_sum += float(record.get("safety_score", 0.0))
            reliability_hits += int(latency_ms > 0)

        vitals = {
            "accuracy": round(correct / len(corpus), 6),
            "latency_ms": round(p95_latency_ms(latencies), 6),
            "cost_per_1k_tokens": round(cost_per_1k_tokens(total_cost, total_tokens), 6),
            "safety_score": round(safety_sum / len(corpus), 6),
            "robustness": compute_robustness(corpus, response_by_case),
        }
        weighted_score = score_model(vitals, schema)
        reliability = round(reliability_hits / len(corpus), 6)

        evidence_ids = {
            metric: _evidence_id(model, metric, float(value))
            for metric, value in sorted(vitals.items())
        }
        evidence_ids["total_score"] = _evidence_id(model, "total_score", weighted_score)

        estimated_runtime_sec = round(sum(latencies) / 1000.0, 6)
        total_estimated_cost += total_cost
        total_estimated_runtime_sec += estimated_runtime_sec

        per_model.append(
            {
                "provider": provider,
                "model": model,
                "model_key": model_key,
                "seed": seed,
                "vitals": vitals,
                "score": weighted_score,
                "reliability": reliability,
                "evidence_ids": evidence_ids,
                "estimated": {
                    "cost_usd": round(total_cost, 6),
                    "runtime_sec": estimated_runtime_sec,
                },
            }
        )

    ranking = sorted(per_model, key=lambda item: (-float(item["score"]), str(item["model_key"])))
    for index, item in enumerate(ranking, start=1):
        item["rank"] = index

    baseline = _read_json(config.baseline_path) if config.baseline_path else None
    regressions: list[dict[str, object]] = []

    if baseline:
        baseline_models = {
            str(item["model_key"]): item
            for item in baseline.get("providers", [])
            if isinstance(item, dict) and "model_key" in item
        }
        for current in ranking:
            baseline_item = baseline_models.get(str(current["model_key"]))
            if not baseline_item:
                continue
            baseline_vitals = baseline_item.get("vitals", {})
            current_vitals = current.get("vitals", {})
            for metric_name, metric_spec in schema.items():
                if metric_name not in baseline_vitals or metric_name not in current_vitals:
                    raise ValueError(f"Missing baseline metric for {current['model_key']}:{metric_name}")
                delta = _regression(
                    float(baseline_vitals[metric_name]),
                    float(current_vitals[metric_name]),
                    str(metric_spec["direction"]),
                )
                if delta > config.max_regression:
                    regressions.append(
                        {
                            "model_key": current["model_key"],
                            "metric": metric_name,
                            "baseline": baseline_vitals[metric_name],
                            "current": current_vitals[metric_name],
                            "regression": round(delta, 6),
                            "threshold": config.max_regression,
                        }
                    )

    budget_violations: list[dict[str, object]] = []
    if total_estimated_runtime_sec > DEFAULT_RUNTIME_BUDGET_SEC:
        budget_violations.append(
            {
                "metric": "eval_runtime_sec",
                "current": round(total_estimated_runtime_sec, 6),
                "budget": DEFAULT_RUNTIME_BUDGET_SEC,
            }
        )
    if total_estimated_cost > DEFAULT_COST_BUDGET_USD:
        budget_violations.append(
            {
                "metric": "eval_cost_usd",
                "current": round(total_estimated_cost, 6),
                "budget": DEFAULT_COST_BUDGET_USD,
            }
        )

    metrics_payload = {
        "schema_version": "v1",
        "schema": schema,
        "providers": ranking,
        "regressions": sorted(regressions, key=lambda item: (str(item["model_key"]), str(item["metric"]))),
        "budgets": {
            "runtime_budget_sec": DEFAULT_RUNTIME_BUDGET_SEC,
            "memory_budget_mb": DEFAULT_MEMORY_BUDGET_MB,
            "cost_budget_usd": DEFAULT_COST_BUDGET_USD,
            "estimated_runtime_sec": round(total_estimated_runtime_sec, 6),
            "estimated_cost_usd": round(total_estimated_cost, 6),
            "violations": budget_violations,
        },
        "inputs": {
            "corpus_file": str(config.corpus_path),
            "fixtures_file": str(config.fixtures_path),
            "schema_file": str(config.schema_path),
            "corpus_sha256": corpus_sha,
            "fixtures_sha256": _file_sha256(config.fixtures_path),
            "schema_sha256": _file_sha256(config.schema_path),
        },
    }

    report_payload = {
        "summary": {
            "models_evaluated": len(ranking),
            "top_model": ranking[0]["model_key"],
            "regression_failures": len(regressions),
            "budget_failures": len(budget_violations),
        },
        "ranking": [
            {
                "rank": item["rank"],
                "model_key": item["model_key"],
                "score": item["score"],
                "vitals": item["vitals"],
                "evidence_ids": item["evidence_ids"],
            }
            for item in ranking
        ],
        "regressions": metrics_payload["regressions"],
        "budget_violations": budget_violations,
        "status": "failed" if regressions or budget_violations else "passed",
    }

    config.out_dir.mkdir(parents=True, exist_ok=True)
    metrics_path = config.out_dir / "metrics.json"
    report_path = config.out_dir / "report.json"
    stamp_path = config.out_dir / "stamp.json"

    metrics_path.write_text(_canonical_json(metrics_payload), encoding="utf-8")
    report_path.write_text(_canonical_json(report_payload), encoding="utf-8")

    stamp_payload = {
        "schema_sha256": _file_sha256(config.schema_path),
        "corpus_sha256": _file_sha256(config.corpus_path),
        "fixtures_sha256": _file_sha256(config.fixtures_path),
        "metrics_sha256": _file_sha256(metrics_path),
        "report_sha256": _file_sha256(report_path),
    }
    stamp_payload["run_sha256"] = hashlib.sha256(
        (stamp_payload["schema_sha256"] + stamp_payload["corpus_sha256"] + stamp_payload["fixtures_sha256"] + stamp_payload["metrics_sha256"] + stamp_payload["report_sha256"]).encode("utf-8")
    ).hexdigest()
    stamp_path.write_text(_canonical_json(stamp_payload), encoding="utf-8")

    return {
        "status": report_payload["status"],
        "metrics_path": str(metrics_path),
        "report_path": str(report_path),
        "stamp_path": str(stamp_path),
        "regressions": regressions,
        "budget_violations": budget_violations,
    }
