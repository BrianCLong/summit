"""Benchmark harness for attention lab suites."""

from __future__ import annotations

import argparse
import json
import os
from dataclasses import asdict, dataclass
from datetime import UTC, datetime, timezone
from pathlib import Path
from time import perf_counter

import torch

from .config import AttnLabConfig, AttnType
from .mhla import linear_attention, mhla_linear_attention, softmax_attention


@dataclass
class SuiteConfig:
    name: str
    seq_len: int
    causal: bool
    chunkwise: bool
    chunk_size: int


def _suites() -> list[SuiteConfig]:
    return [
        SuiteConfig(
            name='agent_transcript',
            seq_len=2048,
            causal=True,
            chunkwise=False,
            chunk_size=256,
        ),
        SuiteConfig(
            name='rag_retrieval_pack',
            seq_len=3072,
            causal=False,
            chunkwise=True,
            chunk_size=256,
        ),
        SuiteConfig(
            name='mixed_chunkwise',
            seq_len=1536,
            causal=True,
            chunkwise=True,
            chunk_size=128,
        ),
    ]


def _attention_for_config(config: AttnLabConfig):
    if config.attn_type == AttnType.SOFTMAX:
        return lambda q, k, v: softmax_attention(q, k, v, causal=config.causal)
    if config.attn_type == AttnType.LINEAR:
        return lambda q, k, v: linear_attention(
            q,
            k,
            v,
            feature_map=config.feature_map,
            causal=config.causal,
        )
    if config.attn_type == AttnType.MHLA:
        return lambda q, k, v: mhla_linear_attention(
            q,
            k,
            v,
            num_token_heads=config.num_token_heads,
            feature_map=config.feature_map,
            causal=config.causal,
            chunkwise=config.chunkwise,
            chunk_size=config.chunk_size,
        )
    raise ValueError(f'Unsupported attn type: {config.attn_type}')


def _benchmark_suite(
    config: AttnLabConfig,
    suite: SuiteConfig,
    *,
    batch_size: int,
    dim: int,
    device: str,
    seed: int,
) -> dict:
    torch.manual_seed(seed)
    if device.startswith('cuda'):
        torch.cuda.manual_seed_all(seed)

    q = torch.randn(batch_size, suite.seq_len, dim, device=device)
    k = torch.randn(batch_size, suite.seq_len, dim, device=device)
    v = torch.randn(batch_size, suite.seq_len, dim, device=device)

    if device.startswith('cuda'):
        torch.cuda.reset_peak_memory_stats()
        torch.cuda.synchronize()

    attn_fn = _attention_for_config(config)

    start = perf_counter()
    output = attn_fn(q, k, v)
    if device.startswith('cuda'):
        torch.cuda.synchronize()
    elapsed = perf_counter() - start

    tokens = batch_size * suite.seq_len
    throughput = tokens / max(elapsed, 1e-9)
    vram = (
        torch.cuda.max_memory_allocated() / (1024**2)
        if device.startswith('cuda')
        else 0.0
    )

    quality = _quality_proxy(config, suite, output, q, k, v)

    return {
        'suite': suite.name,
        'latency_ms': elapsed * 1000,
        'throughput_tok_s': throughput,
        'peak_vram_mb': vram,
        'quality': quality,
        'config': asdict(config),
    }


def _quality_proxy(
    config: AttnLabConfig,
    suite: SuiteConfig,
    output: torch.Tensor,
    query: torch.Tensor,
    key: torch.Tensor,
    value: torch.Tensor,
) -> dict:
    baseline = softmax_attention(query, key, value, causal=suite.causal)
    cosine = torch.nn.functional.cosine_similarity(
        output.flatten(1),
        baseline.flatten(1),
        dim=-1,
    ).mean()
    imputed_intention_order_23 = float(torch.clamp(cosine, min=0.0) ** 23)
    return {
        'agreement_cosine': float(cosine),
        'imputed_intention_order_23': imputed_intention_order_23,
        'output_norm': float(output.norm().mean()),
        'baseline_norm': float(baseline.norm().mean()),
        'attn_type': config.attn_type.value,
    }


def _write_svg_chart(results: list[dict], out_dir: Path) -> Path:
    width = 640
    height = 320
    padding = 40
    max_latency = max(item['latency_ms'] for item in results)
    bar_width = (width - 2 * padding) / max(len(results), 1)

    bars = []
    labels = []
    for idx, item in enumerate(results):
        x = padding + idx * bar_width
        bar_height = (item['latency_ms'] / max_latency) * (height - 2 * padding)
        y = height - padding - bar_height
        bars.append(
            f"<rect x='{x:.1f}' y='{y:.1f}' width='{bar_width * 0.6:.1f}' "
            f"height='{bar_height:.1f}' fill='#3b82f6' />"
        )
        labels.append(
            f"<text x='{x:.1f}' y='{height - padding + 16}' "
            f"font-size='12'>{item['suite']}</text>"
        )

    svg = (
        f"<svg xmlns='http://www.w3.org/2000/svg' width='{width}' height='{height}'>"
        f"<rect width='100%' height='100%' fill='white' />"
        f"<text x='{padding}' y='20' font-size='14'>Latency (ms)</text>"
        f"{''.join(bars)}{''.join(labels)}"
        "</svg>"
    )

    chart_path = out_dir / 'latency_chart.svg'
    chart_path.write_text(svg)
    return chart_path


def _write_report(results: list[dict], out_dir: Path) -> Path:
    lines = [
        '# Attention Lab Benchmark Report',
        '',
        f"Generated: {datetime.now(UTC).isoformat()}",
        '',
        '| Suite | Latency (ms) | Throughput (tok/s) | Peak VRAM (MB) | Agreement | Imputed Intention (23rd) |',
        '| --- | --- | --- | --- | --- | --- |',
    ]
    for item in results:
        quality = item['quality']
        lines.append(
            '| {suite} | {latency:.2f} | {throughput:.2f} | {vram:.2f} | {agree:.4f} | {intent:.8f} |'.format(
                suite=item['suite'],
                latency=item['latency_ms'],
                throughput=item['throughput_tok_s'],
                vram=item['peak_vram_mb'],
                agree=quality['agreement_cosine'],
                intent=quality['imputed_intention_order_23'],
            )
        )
    report_path = out_dir / 'report.md'
    report_path.write_text('\n'.join(lines))
    return report_path


def run_benchmarks(
    *,
    attn_type: AttnType,
    out_dir: Path,
    batch_size: int,
    dim: int,
    device: str,
    seed: int,
    num_token_heads: int,
    feature_map: str,
) -> dict:
    results: list[dict] = []
    for suite in _suites():
        config = AttnLabConfig(
            attn_type=attn_type,
            num_token_heads=num_token_heads,
            feature_map=feature_map,
            chunkwise=suite.chunkwise,
            causal=suite.causal,
            chunk_size=suite.chunk_size,
        )
        results.append(
            _benchmark_suite(
                config,
                suite,
                batch_size=batch_size,
                dim=dim,
                device=device,
                seed=seed,
            )
        )

    out_dir.mkdir(parents=True, exist_ok=True)
    json_path = out_dir / 'results.json'
    json_path.write_text(json.dumps(results, indent=2))
    report_path = _write_report(results, out_dir)
    chart_path = _write_svg_chart(results, out_dir)

    return {
        'results_json': str(json_path),
        'report_md': str(report_path),
        'chart_svg': str(chart_path),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description='Run attention lab benchmarks.')
    parser.add_argument('--attn', choices=[t.value for t in AttnType], default='mhla')
    parser.add_argument('--out', default='artifacts/attn-lab')
    parser.add_argument('--batch-size', type=int, default=2)
    parser.add_argument('--dim', type=int, default=64)
    parser.add_argument('--device', default='cpu')
    parser.add_argument('--seed', type=int, default=17)
    parser.add_argument('--num-token-heads', type=int, default=4)
    parser.add_argument('--feature-map', default='elu+1')
    args = parser.parse_args()

    timestamp = datetime.now(UTC).strftime('%Y%m%d-%H%M%S')
    out_dir = Path(args.out) / timestamp / args.attn

    summary = run_benchmarks(
        attn_type=AttnType(args.attn),
        out_dir=out_dir,
        batch_size=args.batch_size,
        dim=args.dim,
        device=args.device,
        seed=args.seed,
        num_token_heads=args.num_token_heads,
        feature_map=args.feature_map,
    )

    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    main()
