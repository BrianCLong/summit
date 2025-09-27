"""Command line interface for the Reproducible Notebook Freezer."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Iterable, List

from .bundle import NotebookBundler
from .diff_viewer import BundleDiff
from .replay import NotebookReplayer
from .utils import read_json


def freeze(notebook: Path, output: Path | None, data: Iterable[Path], archive: bool = False) -> Path:
    bundle_root = output or notebook.with_suffix(".rnf")
    bundler = NotebookBundler(notebook, bundle_root, data_paths=data)
    manifest = bundler.run(archive=archive)
    print(str(manifest))
    return manifest


def replay(bundle: Path) -> Path:
    bundle_path = bundle
    if bundle_path.is_file() and bundle_path.name == "manifest.json":
        bundle_path = bundle_path.parent
    replayer = NotebookReplayer(bundle_path)
    replay_dir = replayer.run()
    print(str(replay_dir))
    return replay_dir


def diff(lhs: Path, rhs: Path) -> str:
    lhs_dir = lhs.parent if lhs.is_file() and lhs.name == "manifest.json" else lhs
    rhs_dir = rhs.parent if rhs.is_file() and rhs.name == "manifest.json" else rhs
    viewer = BundleDiff(lhs_dir, rhs_dir)
    text = viewer.render()
    print(text)
    return text


def cache_key(bundle: Path) -> str:
    manifest = read_json(bundle / "manifest.json")
    key = manifest.get("cache_key", "")
    print(key)
    return key


def ci_check(root: Path) -> None:
    manifests: List[Path] = list(root.rglob("manifest.json"))
    bundles = [manifest.parent for manifest in manifests if manifest.parent.name.endswith(".rnf")]
    success = True
    for bundle in bundles:
        try:
            NotebookReplayer(bundle).run()
        except Exception as exc:  # noqa: BLE001
            success = False
            print(f"Replay failed for {bundle}: {exc}", file=sys.stderr)
    if not success:
        raise SystemExit("RNF replay check failed")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Reproducible Notebook Freezer")
    sub = parser.add_subparsers(dest="command", required=True)

    freeze_cmd = sub.add_parser("freeze", help="Freeze a notebook into an RNF bundle")
    freeze_cmd.add_argument("notebook", type=Path)
    freeze_cmd.add_argument("--output", type=Path)
    freeze_cmd.add_argument("--data", type=Path, nargs="*", default=[])
    freeze_cmd.add_argument("--archive", action="store_true")

    replay_cmd = sub.add_parser("replay", help="Replay a bundle")
    replay_cmd.add_argument("bundle", type=Path)

    diff_cmd = sub.add_parser("diff", help="Show output differences between bundles")
    diff_cmd.add_argument("lhs", type=Path)
    diff_cmd.add_argument("rhs", type=Path)

    cache_cmd = sub.add_parser("cache-key", help="Print cache key for bundle")
    cache_cmd.add_argument("bundle", type=Path)

    ci_cmd = sub.add_parser("ci-check", help="Replay all bundles to ensure determinism")
    ci_cmd.add_argument("--root", type=Path, default=Path("."))

    return parser


def main(argv: Iterable[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.command == "freeze":
        freeze(args.notebook, args.output, args.data, archive=args.archive)
    elif args.command == "replay":
        replay(args.bundle)
    elif args.command == "diff":
        diff(args.lhs, args.rhs)
    elif args.command == "cache-key":
        cache_key(args.bundle)
    elif args.command == "ci-check":
        ci_check(args.root)
    else:  # pragma: no cover
        parser.error(f"Unknown command {args.command}")


if __name__ == "__main__":
    main()
