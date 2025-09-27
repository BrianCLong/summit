"""Command line interface for ITRC capsules."""

from __future__ import annotations

import argparse
import json
import shlex
from pathlib import Path
from typing import List

from .capsule import CapsuleBuilder, load_capsule, prepare_artifacts, write_capsule
from .receipt import load_receipt, verify_receipt_artifacts
from .runner import CapsuleReplayError, parse_env_overrides, run_capsule
from .signing import Signer, Verifier
from .utils import Attachment, load_key, parse_key_value


def main(argv: List[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    try:
        if args.subcommand == "pack":
            return _cmd_pack(args)
        if args.subcommand == "verify":
            return _cmd_verify(args)
        if args.subcommand == "run":
            return _cmd_run(args)
        if args.subcommand == "receipt-verify":
            return _cmd_receipt_verify(args)
    except CapsuleReplayError as exc:
        parser.error(str(exc))
    except Exception as exc:  # pragma: no cover - CLI guard rail
        parser.error(str(exc))
    return 0


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="itrc", description="Immutable Training Run Capsule toolkit")
    sub = parser.add_subparsers(dest="subcommand", required=True)

    pack = sub.add_parser("pack", help="Build a signed capsule")
    pack.add_argument("--capsule", required=True, help="Destination capsule file")
    pack.add_argument("--name", required=True, help="Capsule name")
    pack.add_argument("--command", dest="job_command", required=True, help="Command to execute (quoted)")
    pack.add_argument("--workdir", default=str(Path.cwd()), help="Working directory of the job")
    pack.add_argument("--env", action="append", default=[], help="Environment variable KEY=VALUE")
    pack.add_argument("--env-lock", required=True, help="Environment lockfile to embed")
    pack.add_argument("--image-digest", required=True, help="Container image digest")
    pack.add_argument("--dataset-lineage", action="append", default=[], help="Dataset lineage identifier")
    pack.add_argument("--seed", action="append", default=[], help="Deterministic seed KEY=VALUE")
    pack.add_argument("--hardware", action="append", default=[], help="Hardware hint KEY=VALUE")
    pack.add_argument("--policy", action="append", default=[], help="Policy hash KEY=VALUE")
    pack.add_argument("--artifact", action="append", default=[], help="Expected artifact path")
    pack.add_argument("--key", required=True, help="Signing key file")
    pack.add_argument("--key-id", required=True, help="Identifier to embed for the signing key")
    pack.add_argument("--description", help="Optional description for the capsule")

    verify = sub.add_parser("verify", help="Verify capsule integrity")
    verify.add_argument("--capsule", required=True)
    verify.add_argument("--key", required=True)

    run = sub.add_parser("run", help="Replay a capsule and emit a receipt")
    run.add_argument("--capsule", required=True)
    run.add_argument("--key", required=True)
    run.add_argument("--key-id", help="Identifier used when signing the receipt (defaults to capsule key id)")
    run.add_argument("--receipt", required=True, help="Receipt output path")
    run.add_argument("--artifact-base", help="Directory to read artifacts from (defaults to working dir)")
    run.add_argument("--workdir", help="Override working directory for the run")
    run.add_argument("--env", action="append", default=[], help="Override environment variable KEY=VALUE")

    receipt_verify = sub.add_parser("receipt-verify", help="Verify a receipt against a capsule")
    receipt_verify.add_argument("--capsule", required=True)
    receipt_verify.add_argument("--receipt", required=True)
    receipt_verify.add_argument("--key", required=True)
    receipt_verify.add_argument("--artifact-base", help="Directory where artifacts should be located for verification")

    return parser


def _cmd_pack(args: argparse.Namespace) -> int:
    key = load_key(Path(args.key))
    signer = Signer(key, args.key_id)
    env_lock_attachment = Attachment.from_source(Path(args.env_lock))
    working_dir = Path(args.workdir).resolve()

    env_vars = parse_key_value(args.env)
    seeds = parse_key_value(args.seed)
    hardware_hints = parse_key_value(args.hardware)
    policy_hashes = parse_key_value(args.policy)
    dataset_lineage = sorted(set(args.dataset_lineage))

    artifacts = prepare_artifacts(args.artifact, working_dir)

    builder = CapsuleBuilder(
        name=args.name,
        command=shlex.split(args.job_command),
        working_dir=working_dir,
        env=env_vars,
        container_image_digest=args.image_digest,
        env_lock_attachment=env_lock_attachment,
        dataset_lineage_ids=dataset_lineage,
        seeds=seeds,
        hardware_hints=hardware_hints,
        policy_hashes=policy_hashes,
        artifacts=artifacts,
        description=args.description,
    )
    capsule = builder.build(signer)
    write_capsule(capsule, [env_lock_attachment], Path(args.capsule))

    print(json.dumps({"capsule": args.capsule, "artifacts": [a.path for a in artifacts]}, indent=2))
    return 0


def _cmd_verify(args: argparse.Namespace) -> int:
    key = load_key(Path(args.key))
    verifier = Verifier(key)
    load_capsule(Path(args.capsule), verifier)
    print(json.dumps({"verified": True, "capsule": args.capsule}))
    return 0


def _cmd_run(args: argparse.Namespace) -> int:
    key = load_key(Path(args.key))
    env_overrides = parse_env_overrides(args.env)
    receipt_path = Path(args.receipt)
    artifact_base = Path(args.artifact_base).resolve() if args.artifact_base else None
    workdir = Path(args.workdir).resolve() if args.workdir else None
    run_capsule(
        Path(args.capsule),
        key=key,
        key_id=args.key_id,
        receipt_path=receipt_path,
        artifact_base=artifact_base,
        env_overrides=env_overrides,
        workspace_override=workdir,
    )
    print(json.dumps({"receipt": str(receipt_path)}))
    return 0


def _cmd_receipt_verify(args: argparse.Namespace) -> int:
    key = load_key(Path(args.key))
    verifier = Verifier(key)
    capsule = load_capsule(Path(args.capsule), verifier)
    receipt = load_receipt(Path(args.receipt), verifier)

    artifact_base = Path(args.artifact_base).resolve() if args.artifact_base else Path(capsule.manifest["working_dir"]).resolve()
    verified = verify_receipt_artifacts(receipt, artifact_base)
    print(
        json.dumps(
            {
                "receipt": args.receipt,
                "verified": all(item.expected_sha256 == item.actual_sha256 for item in verified),
                "artifacts": [item.as_dict() for item in verified],
            },
            indent=2,
        )
    )
    return 0
