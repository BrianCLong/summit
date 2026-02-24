#!/usr/bin/env python3
from __future__ import annotations

import argparse
import importlib.util
import json
import statistics
import tempfile
import time
import tracemalloc
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parents[1] / "governance" / "generate_pack.py"

spec = importlib.util.spec_from_file_location("generate_pack", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(module)


def fail(message: str) -> None:
    raise SystemExit(f"FAIL: {message}")


def profile_one(
    *,
    spec_path: Path,
    slug: str,
    repo_root: Path,
    schema_path: Path,
    iterations: int,
) -> dict[str, object]:
    runtimes_ms: list[float] = []
    peaks_mb: list[float] = []

    # Warm the generator to remove import and validator initialization from budget checks.
    with tempfile.TemporaryDirectory(prefix="governance-pack-profile-warmup-") as warm_dir:
        module.generate_pack(
            spec_path=spec_path,
            slug=slug,
            output_root=Path(warm_dir),
            repo_root=repo_root,
            schema_path=schema_path,
            emit_supporting_artifacts=True,
        )

    for _ in range(iterations):
        # Runtime sample without profiling overhead.
        with tempfile.TemporaryDirectory(prefix="governance-pack-profile-") as tmp_dir:
            out_root = Path(tmp_dir)
            start = time.perf_counter()
            module.generate_pack(
                spec_path=spec_path,
                slug=slug,
                output_root=out_root,
                repo_root=repo_root,
                schema_path=schema_path,
                emit_supporting_artifacts=True,
            )
            elapsed_ms = (time.perf_counter() - start) * 1000.0
        runtimes_ms.append(elapsed_ms)

        # Memory sample with tracemalloc in a separate run.
        with tempfile.TemporaryDirectory(prefix="governance-pack-profile-mem-") as mem_dir:
            out_root = Path(mem_dir)
            tracemalloc.start()
            module.generate_pack(
                spec_path=spec_path,
                slug=slug,
                output_root=out_root,
                repo_root=repo_root,
                schema_path=schema_path,
                emit_supporting_artifacts=True,
            )
            _, peak_bytes = tracemalloc.get_traced_memory()
            tracemalloc.stop()
        peaks_mb.append(peak_bytes / (1024.0 * 1024.0))

    return {
        "item_slug": slug,
        "iterations": iterations,
        "runtime_ms": {
            "max": round(max(runtimes_ms), 3),
            "median": round(statistics.median(runtimes_ms), 3),
            "min": round(min(runtimes_ms), 3),
        },
        "memory_mb": {
            "max": round(max(peaks_mb), 3),
            "median": round(statistics.median(peaks_mb), 3),
            "min": round(min(peaks_mb), 3),
        },
    }


def write_json(path: Path, payload: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Profile governance pack generation performance.")
    parser.add_argument("--repo-root", type=Path, default=Path("."), help="Repository root")
    parser.add_argument("--schema", type=Path, default=Path("governance/schema/governance.schema.json"))
    parser.add_argument("--item-slug", help="Profile one governance item slug")
    parser.add_argument("--iterations", type=int, default=3, help="Number of profiling runs per item")
    parser.add_argument("--max-runtime-ms", type=float, default=200.0)
    parser.add_argument("--max-memory-mb", type=float, default=50.0)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_root = args.repo_root.resolve()
    schema_path = (repo_root / args.schema).resolve() if not args.schema.is_absolute() else args.schema

    if args.iterations < 1:
        fail("--iterations must be >= 1")

    spec_paths: list[Path]
    if args.item_slug:
        spec_paths = [repo_root / "governance" / args.item_slug / "input.spec.json"]
    else:
        spec_paths = sorted((repo_root / "governance").glob("*/input.spec.json"))

    if not spec_paths:
        fail("No governance specs found to profile")

    failures: list[str] = []
    for spec_path in spec_paths:
        if not spec_path.exists():
            fail(f"Missing spec path: {spec_path}")
        slug = spec_path.parent.name
        result = profile_one(
            spec_path=spec_path,
            slug=slug,
            repo_root=repo_root,
            schema_path=schema_path,
            iterations=args.iterations,
        )

        perf_path = repo_root / "governance" / slug / "perf.json"
        write_json(perf_path, result)

        runtime_median = float(result["runtime_ms"]["median"])
        memory_max = float(result["memory_mb"]["max"])

        if runtime_median > args.max_runtime_ms:
            failures.append(f"{slug}: runtime median {runtime_median}ms > {args.max_runtime_ms}ms")
        if memory_max > args.max_memory_mb:
            failures.append(f"{slug}: memory {memory_max}MB > {args.max_memory_mb}MB")

        print(f"Profiled {slug}: runtime_median={runtime_median}ms memory_max={memory_max}MB")

    if failures:
        for failure in failures:
            print(f"FAIL: {failure}")
        return 1

    print("Governance performance budgets satisfied")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
