#!/usr/bin/env python3
"""Build an offline bundle of container images and Helm charts for air-gapped installs."""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import shutil
import subprocess
import tarfile
import tempfile
from pathlib import Path
from typing import Dict, Iterable, List


def run_command(cmd: List[str], *, cwd: Path | None = None) -> None:
    """Run a shell command and raise a helpful error on failure."""
    process = subprocess.run(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    if process.returncode != 0:
        raise RuntimeError(f"Command {' '.join(cmd)} failed with exit code {process.returncode}\n{process.stdout}")
    if process.stdout:
        print(process.stdout)


def sha256sum(path: Path) -> str:
    """Compute the SHA256 digest of a file."""
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def ensure_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def package_chart(chart: Dict[str, object], destination: Path) -> Dict[str, object]:
    chart_path = Path(chart["path"])
    if not chart_path.exists():
        raise FileNotFoundError(f"Chart path {chart_path} does not exist")

    values_files: Iterable[str] = chart.get("values", [])  # type: ignore[assignment]
    values_args: List[str] = []
    for values_file in values_files:
        values_args.extend(["--values", values_file])

    # Build dependencies first to ensure packaged chart is self-contained
    if (chart_path / "Chart.yaml").exists():
        try:
            run_command(["helm", "dependency", "build", str(chart_path)])
        except RuntimeError as exc:
            raise RuntimeError(f"Failed to build dependencies for {chart['name']}: {exc}") from exc

    ensure_directory(destination)
    package_args = [
        "helm",
        "package",
        str(chart_path),
        "--destination",
        str(destination),
    ] + values_args

    run_command(package_args)

    # Find the generated tgz file (helm outputs the filename)
    generated = sorted(destination.glob(f"{chart['name']}-*.tgz"))
    if not generated:
        raise RuntimeError(f"Helm did not produce a package for {chart['name']}")
    latest = max(generated, key=lambda p: p.stat().st_mtime)
    return {
        "name": chart["name"],
        "file": str(latest.relative_to(destination.parent)),
        "sha256": sha256sum(latest),
        "size": latest.stat().st_size,
    }


def save_image(image: Dict[str, object], destination: Path, *, skip_pull: bool) -> Dict[str, object]:
    image_name = image["name"]
    if not skip_pull:
        run_command(["docker", "pull", image_name])

    safe_name = image_name.replace("/", "_").replace(":", "-")
    archive_path = destination / f"{safe_name}.tar"
    run_command(["docker", "save", "-o", str(archive_path), image_name])
    return {
        "name": image_name,
        "file": str(archive_path.relative_to(destination.parent)),
        "sha256": sha256sum(archive_path),
        "size": archive_path.stat().st_size,
    }


def build_bundle(manifest_path: Path, output_dir: Path, *, skip_pull: bool = False) -> Path:
    with manifest_path.open("r", encoding="utf-8") as handle:
        manifest = json.load(handle)

    bundle_version = manifest.get("bundleVersion", "0.0.0")
    output_settings = manifest.get("output", {})
    archive_name = output_settings.get("archiveName", "airgap-bundle.tgz")

    staging_root = Path(tempfile.mkdtemp(prefix="airgap-bundle-"))
    charts_dir = staging_root / "charts"
    images_dir = staging_root / "images"
    ledger_dir = staging_root / "ledger"
    manifests_dir = staging_root / "manifests"

    ensure_directory(charts_dir)
    ensure_directory(images_dir)
    ensure_directory(ledger_dir)
    ensure_directory(manifests_dir)

    try:
        chart_entries: List[Dict[str, object]] = []
        for chart in manifest.get("charts", []):
            chart_entries.append(package_chart(chart, charts_dir))

        image_entries: List[Dict[str, object]] = []
        for image in manifest.get("images", []):
            image_entries.append(save_image(image, images_dir, skip_pull=skip_pull))

        provenance = {
            "bundleVersion": bundle_version,
            "generatedAt": dt.datetime.utcnow().isoformat() + "Z",
            "charts": chart_entries,
            "images": image_entries,
        }

        ledger_path = ledger_dir / Path(manifest.get("provenance", {}).get("ledgerPath", "provenance-ledger.json")).name
        with ledger_path.open("w", encoding="utf-8") as handle:
            json.dump(provenance, handle, indent=2)
            handle.write("\n")

        resync_manifest = {
            "bundleVersion": bundle_version,
            "generatedAt": provenance["generatedAt"],
            "items": chart_entries + image_entries,
        }
        resync_path = ledger_dir / Path(manifest.get("provenance", {}).get("resyncManifest", "resync-manifest.json")).name
        with resync_path.open("w", encoding="utf-8") as handle:
            json.dump(resync_manifest, handle, indent=2)
            handle.write("\n")

        manifest_copy = manifests_dir / manifest_path.name
        shutil.copy2(manifest_path, manifest_copy)

        ensure_directory(output_dir)
        ledger_output_dir = output_dir / "ledger"
        ensure_directory(ledger_output_dir)
        shutil.copy2(ledger_path, ledger_output_dir / ledger_path.name)
        shutil.copy2(resync_path, ledger_output_dir / resync_path.name)

        archive_path = output_dir / archive_name
        with tarfile.open(archive_path, "w:gz") as tar:
            for directory in (charts_dir, images_dir, ledger_dir, manifests_dir):
                for item in directory.rglob("*"):
                    tar.add(item, arcname=item.relative_to(staging_root))

        checksum_path = archive_path.with_suffix(archive_path.suffix + ".sha256")
        with checksum_path.open("w", encoding="utf-8") as handle:
            handle.write(f"{sha256sum(archive_path)}  {archive_path.name}\n")

        print(f"Bundle written to {archive_path}")
        print(f"Checksum written to {checksum_path}")

        return archive_path
    finally:
        shutil.rmtree(staging_root)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build an IntelGraph air-gap installation bundle")
    parser.add_argument("--manifest", default="infra/airgap/bundle.manifest.json", type=Path, help="Path to bundle manifest")
    parser.add_argument(
        "--output-dir",
        default=None,
        type=Path,
        help="Directory to store the resulting archive (defaults to manifest output directory)",
    )
    parser.add_argument(
        "--skip-pull",
        action="store_true",
        help="Assume the required container images are already present locally",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    manifest_path: Path = args.manifest
    if not manifest_path.exists():
        raise FileNotFoundError(f"Manifest {manifest_path} does not exist")

    with manifest_path.open("r", encoding="utf-8") as handle:
        manifest = json.load(handle)

    default_output_dir = manifest.get("output", {}).get("directory")
    if args.output_dir:
        output_dir = args.output_dir
    elif default_output_dir:
        output_dir = Path(default_output_dir)
    else:
        output_dir = manifest_path.parent / "dist"

    build_bundle(manifest_path, output_dir, skip_pull=args.skip_pull)


if __name__ == "__main__":
    main()
