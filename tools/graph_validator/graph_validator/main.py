from __future__ import annotations

import argparse
import hashlib
import os
from pathlib import Path
from typing import Dict

from graph_validator.checks.counts import placeholder_counts
from graph_validator.config.mapping import load_mapping, mapping_to_dict
from graph_validator.evidence.ids import EvidenceIdInputs, derive_evidence_id
from graph_validator.evidence.stamp import StampInputs, build_stamp
from graph_validator.emit.json import write_json


def _hash_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _resolve_code_sha(cli_value: str | None) -> str:
    if cli_value:
        return cli_value
    env_sha = os.environ.get('GITHUB_SHA')
    if env_sha:
        return env_sha
    return 'local'


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Graph↔Postgres Drift Validator (scaffold)')
    parser.add_argument(
        '--mapping',
        required=True,
        type=Path,
        help='Path to mapping.yml contract',
    )
    parser.add_argument(
        '--out',
        type=Path,
        default=Path('tools/graph_validator/reports'),
        help='Output directory for reports',
    )
    parser.add_argument(
        '--mode',
        choices=['ci', 'nightly', 'audit'],
        default='ci',
        help='Execution mode',
    )
    parser.add_argument('--seed', help='Override deterministic seed')
    parser.add_argument('--tenant', help='Tenant namespace for report isolation')
    parser.add_argument('--code-sha', help='Override git SHA for evidence ID')
    return parser.parse_args()


def _build_report_payload(mapping_payload: Dict[str, object]) -> Dict[str, object]:
    counts = placeholder_counts()
    return {
        'status': 'scaffold',
        'checks': {
            'counts': {
                'status': counts.status,
                'details': counts.details,
            }
        },
        'mapping': mapping_payload,
    }


def main() -> None:
    args = _parse_args()
    mapping_path = args.mapping
    mapping_bytes = mapping_path.read_bytes()
    mapping_sha = _hash_bytes(mapping_bytes)
    mapping = load_mapping(mapping_path, tenant=args.tenant)
    seed = args.seed or mapping.seed
    code_sha = _resolve_code_sha(args.code_sha)
    evidence_id = derive_evidence_id(
        EvidenceIdInputs(
            code_sha=code_sha,
            mapping_bytes=mapping_bytes,
            seed=seed,
            mode=args.mode,
        )
    )
    out_root = args.out
    if args.tenant:
        out_root = out_root / args.tenant
    evidence_dir = out_root / evidence_id
    latest_dir = out_root / 'latest'

    mapping_payload = mapping_to_dict(mapping)
    report_payload = _build_report_payload(mapping_payload)
    metrics_payload = {
        'evidence_id': evidence_id,
        'status': 'scaffold',
        'checks': ['counts'],
    }
    stamp_payload = build_stamp(
        StampInputs(
            evidence_id=evidence_id,
            mapping_sha256=mapping_sha,
            seed=seed,
            mode=args.mode,
            code_sha=code_sha,
        )
    )

    write_json(evidence_dir / 'report.json', report_payload)
    write_json(evidence_dir / 'metrics.json', metrics_payload)
    write_json(evidence_dir / 'stamp.json', stamp_payload)
    write_json(latest_dir / 'summary.json', metrics_payload)

    print(f'Graph validator scaffold complete: {evidence_id}')


if __name__ == '__main__':
    main()
