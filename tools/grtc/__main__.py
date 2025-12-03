"""Command line interface for the GRTC compiler."""

from __future__ import annotations

import argparse
import json
from importlib import import_module
from pathlib import Path
from typing import Any

from .ci import generate_ci_assets
from .compiler import (
    CorpusCompiler,
    load_specification,
    parse_specification,
    write_corpus,
)
from .runtime import ReferenceAdapter, execute_corpus
from .signing import Signer, load_signer


def main() -> int:
    parser = argparse.ArgumentParser(prog="grtc", description="GRTC compiler CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    compile_parser = subparsers.add_parser("compile", help="Compile governance requirements into a corpus")
    compile_parser.add_argument("spec", type=Path, help="Path to the governance YAML specification")
    compile_parser.add_argument("--output", type=Path, default=Path("dist/grtc"), help="Output directory for the compiled corpus")
    compile_parser.add_argument("--seed", type=str, default=None, help="Override the specification seed")
    compile_parser.add_argument("--signing-key", type=str, default=None, help="Signing key material")
    compile_parser.add_argument("--signing-key-file", type=Path, default=None, help="File containing signing key material")
    compile_parser.add_argument("--skip-ci", action="store_true", help="Skip CI runner generation")

    verify_parser = subparsers.add_parser("verify", help="Verify a manifest signature")
    verify_parser.add_argument("manifest", type=Path, help="Path to manifest.json")
    verify_parser.add_argument("--signing-key", type=str, default=None)
    verify_parser.add_argument("--signing-key-file", type=Path, default=None)

    run_parser = subparsers.add_parser("run", help="Execute a compiled corpus using an adapter")
    run_parser.add_argument("--corpus", type=Path, required=True, help="Directory containing the compiled corpus")
    run_parser.add_argument("--adapter", type=str, default="reference", help="Adapter specifier (reference or module:attr)")
    run_parser.add_argument("--verify-signature", action="store_true", help="Verify manifest signature before running")
    run_parser.add_argument("--signing-key", type=str, default=None)
    run_parser.add_argument("--signing-key-file", type=Path, default=None)

    args = parser.parse_args()

    if args.command == "compile":
        return _compile_command(args)
    if args.command == "verify":
        return _verify_command(args)
    if args.command == "run":
        return _run_command(args)
    parser.error("Unknown command")
    return 1


def _compile_command(args: argparse.Namespace) -> int:
    raw_spec = load_specification(args.spec)
    spec = parse_specification(raw_spec, seed_override=args.seed)
    signer = _resolve_signer(args, default_key=spec.seed)
    compiler = CorpusCompiler(spec)
    artifact = compiler.compile()
    manifest_path = write_corpus(artifact, args.output, signer)
    if not args.skip_ci:
        generate_ci_assets(args.output)
    print(json.dumps({"manifest": str(manifest_path), "tests": len(artifact.tests)}, indent=2))
    return 0


def _verify_command(args: argparse.Namespace) -> int:
    signer = _resolve_signer(args)
    manifest_path = args.manifest
    with manifest_path.open("r", encoding="utf-8") as handle:
        manifest: dict[str, Any] = json.load(handle)
    signature_block = manifest.get("signature", {})
    if not isinstance(signature_block, dict):
        raise SystemExit("Manifest does not contain a signature block.")
    signature = signature_block.get("value")
    if not isinstance(signature, str):
        raise SystemExit("Signature block is missing the value field.")
    if not signer.verify_manifest(manifest, signature):
        raise SystemExit("Signature verification failed.")
    print("Signature verification succeeded.")
    return 0


def _run_command(args: argparse.Namespace) -> int:
    adapter = _load_adapter(args.adapter)
    signer = None
    if args.verify_signature:
        signer = _resolve_signer(args)
    results = execute_corpus(args.corpus, adapter, signer=signer, verify_signature=args.verify_signature)
    failures = [result for result in results if not result.passed]
    summary = {
        "total": len(results),
        "passed": len(results) - len(failures),
        "failed": [result.test_id for result in failures],
    }
    print(json.dumps(summary, indent=2))
    return 0 if not failures else 1


def _resolve_signer(args: argparse.Namespace, default_key: str | None = None) -> Signer:
    key_material = None
    if getattr(args, "signing_key_file", None):
        key_material = args.signing_key_file.read_text(encoding="utf-8").strip()
    elif getattr(args, "signing_key", None):
        key_material = args.signing_key
    else:
        key_material = default_key
    return load_signer(key_material)


def _load_adapter(spec: str):
    if spec == "reference":
        return ReferenceAdapter()
    if ":" in spec:
        module_name, attr = spec.split(":", 1)
        module = import_module(module_name)
        adapter_factory = getattr(module, attr)
        return adapter_factory()
    raise ValueError(f"Unknown adapter specifier: {spec}")


if __name__ == "__main__":
    raise SystemExit(main())
