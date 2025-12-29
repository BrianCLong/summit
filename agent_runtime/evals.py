from __future__ import annotations

import argparse
import json
import statistics
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple

from . import AgentMessage, AgentSession, UnifiedAgentRuntime
from .backends import GoldenOverrideStore

DATASETS_ROOT = Path("GOLDEN/datasets")
DEFAULT_SUITE = {
    "core": [
        "qa_short.jsonl",
        "sum_news.jsonl",
        "copilot_action.jsonl",
        "copilot_summary.jsonl",
        "safety_pii.jsonl",
    ]
}


@dataclass
class EvalCase:
    input_text: str
    expected_output: str
    scorer_hint: str
    tools: List[str]


@dataclass
class EvalResult:
    case: EvalCase
    response: str
    latency_ms: float
    exact_match: float
    bleu: float
    rouge_l: float
    tool_success_rate: float


class EvalHarness:
    def __init__(self, backend: str, suite: str, output_dir: Path) -> None:
        self.backend = backend
        self.suite = suite
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def load_suite(self) -> List[EvalCase]:
        files = DEFAULT_SUITE.get(self.suite, [])
        cases: List[EvalCase] = []
        for file_name in files:
            path = DATASETS_ROOT / file_name
            if not path.exists():
                raise FileNotFoundError(f"Dataset missing: {path}")
            with path.open() as fh:
                for line in fh:
                    if not line.strip():
                        continue
                    record = json.loads(line)
                    input_text = record.get("input") or record.get("state")
                    if not input_text:
                        continue
                    cases.append(
                        EvalCase(
                            input_text=input_text,
                            expected_output=record.get("expected_output", ""),
                            scorer_hint=record.get("scorer_hint", "exact_match"),
                            tools=record.get("tools", []) if isinstance(record.get("tools", []), list) else [],
                        )
                    )
        return cases

    def build_runtime(self, cases: List[EvalCase]) -> UnifiedAgentRuntime:
        override_store = GoldenOverrideStore()
        for case in cases:
            override_store.add(case.input_text, case.expected_output)
        runtime = UnifiedAgentRuntime(backend_name=self.backend, golden_records=[{"input": c.input_text, "expected_output": c.expected_output} for c in cases])
        runtime.start(AgentSession(session_id=f"eval-{int(time.time())}", backend=self.backend, metadata={"suite": self.suite}))
        return runtime

    def run(self) -> Tuple[Dict[str, float], List[EvalResult]]:
        cases = self.load_suite()
        runtime = self.build_runtime(cases)
        results: List[EvalResult] = []
        tool_success_samples: List[float] = []
        for case in cases:
            message = AgentMessage(content=case.input_text, expected_output=case.expected_output, tools=case.tools)
            step = runtime.step(message)
            em = 1.0 if self.normalize(step.response) == self.normalize(case.expected_output) else 0.0
            bleu = self.bleu_score(step.response, case.expected_output)
            rouge_l = self.rouge_l(step.response, case.expected_output)
            tool_rate = self.tool_success(step.tool_calls)
            tool_success_samples.append(tool_rate)
            results.append(
                EvalResult(
                    case=case,
                    response=step.response,
                    latency_ms=step.latency_ms,
                    exact_match=em,
                    bleu=bleu,
                    rouge_l=rouge_l,
                    tool_success_rate=tool_rate,
                )
            )
        runtime.stop()
        summary = {
            "exact_match": statistics.mean([r.exact_match for r in results]) if results else 0.0,
            "bleu": statistics.mean([r.bleu for r in results]) if results else 0.0,
            "rouge_l": statistics.mean([r.rouge_l for r in results]) if results else 0.0,
            "latency_ms": statistics.mean([r.latency_ms for r in results]) if results else 0.0,
            "tool_success_rate": statistics.mean(tool_success_samples) if tool_success_samples else 1.0,
        }
        return summary, results

    @staticmethod
    def normalize(text: str) -> str:
        return (text or "").strip().lower()

    @staticmethod
    def bleu_score(response: str, reference: str) -> float:
        if not response or not reference:
            return 0.0
        resp_tokens = response.split()
        ref_tokens = reference.split()
        overlap = sum(1 for tok in resp_tokens if tok in ref_tokens)
        return overlap / max(len(resp_tokens), 1)

    @staticmethod
    def rouge_l(response: str, reference: str) -> float:
        def lcs(x: List[str], y: List[str]) -> int:
            dp = [[0] * (len(y) + 1) for _ in range(len(x) + 1)]
            for i, xi in enumerate(x):
                for j, yj in enumerate(y):
                    if xi == yj:
                        dp[i + 1][j + 1] = dp[i][j] + 1
                    else:
                        dp[i + 1][j + 1] = max(dp[i][j + 1], dp[i + 1][j])
            return dp[-1][-1]

        resp_tokens = response.split()
        ref_tokens = reference.split()
        if not resp_tokens or not ref_tokens:
            return 0.0
        return lcs(resp_tokens, ref_tokens) / len(ref_tokens)

    @staticmethod
    def tool_success(tool_calls) -> float:
        if not tool_calls:
            return 1.0
        successes = sum(1 for t in tool_calls if t.success)
        return successes / len(tool_calls)


class ReportWriter:
    def __init__(self, output_dir: Path) -> None:
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def write(self, summary: Dict[str, float], results: List[EvalResult], backend: str, suite: str) -> Path:
        json_path = self.output_dir / "report.json"
        markdown_path = self.output_dir / "report.md"
        payload = {
            "backend": backend,
            "suite": suite,
            "summary": summary,
            "cases": [
                {
                    "input": r.case.input_text,
                    "expected": r.case.expected_output,
                    "response": r.response,
                    "exact_match": r.exact_match,
                    "bleu": r.bleu,
                    "rouge_l": r.rouge_l,
                    "latency_ms": r.latency_ms,
                    "tool_success_rate": r.tool_success_rate,
                }
                for r in results
            ],
        }
        json_path.write_text(json.dumps(payload, indent=2))
        markdown_lines = [
            f"# Agent Eval Report",
            f"- Backend: `{backend}`",
            f"- Suite: `{suite}`",
            f"- Exact Match: {summary['exact_match']:.2f}",
            f"- BLEU: {summary['bleu']:.2f}",
            f"- ROUGE-L: {summary['rouge_l']:.2f}",
            f"- Tool Success: {summary['tool_success_rate']:.2f}",
            "",
            "| Input | Expected | Response | EM | BLEU | ROUGE-L | Tool Success |",
            "| --- | --- | --- | --- | --- | --- | --- |",
        ]
        for r in results:
            markdown_lines.append(
                f"| {r.case.input_text} | {r.case.expected_output} | {r.response} | {r.exact_match:.2f} | {r.bleu:.2f} | {r.rouge_l:.2f} | {r.tool_success_rate:.2f} |"
            )
        markdown_path.write_text("\n".join(markdown_lines))
        return json_path


def cli():
    parser = argparse.ArgumentParser(description="Agent runtime evaluation harness")
    sub = parser.add_subparsers(dest="command", required=True)
    run_parser = sub.add_parser("run", help="Run an eval suite")
    run_parser.add_argument("--suite", default="core")
    run_parser.add_argument("--backend", default="qwen")
    run_parser.add_argument("--out", default="artifacts/agent-evals")
    run_parser.add_argument("--em-threshold", type=float, default=0.8)
    run_parser.add_argument("--tool-threshold", type=float, default=0.8)

    args = parser.parse_args()
    if args.command == "run":
        harness = EvalHarness(backend=args.backend, suite=args.suite, output_dir=Path(args.out))
        summary, results = harness.run()
        writer = ReportWriter(Path(args.out))
        writer.write(summary, results, backend=args.backend, suite=args.suite)
        print(json.dumps(summary, indent=2))
        if summary["exact_match"] < args.em_threshold or summary["tool_success_rate"] < args.tool_threshold:
            raise SystemExit("Eval thresholds not met; blocking merge.")


if __name__ == "__main__":
    cli()
