import argparse
import hashlib
import json
import os
import sys
import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

METRIC_DIR = Path(os.getenv("BACKUP_METRIC_DIR", "/tmp/backup-metrics"))
ARTIFACT_DIR = Path(os.getenv("BACKUP_ARTIFACT_DIR", "/tmp/backup-artifacts"))


@dataclass
class BackupTarget:
    name: str
    backup_fn: Callable[[], Path]
    verify_fn: Callable[[Path], bool]


def _timestamp() -> str:
    return datetime.now(UTC).isoformat()


def _write_metric(metric: str, value: float, labels: dict[str, str] | None = None) -> None:
    labels = labels or {}
    METRIC_DIR.mkdir(parents=True, exist_ok=True)
    label_str = "".join([f'{{{k}="{v}"}}' for k, v in sorted(labels.items())])
    metric_line = f"{metric}{label_str} {value}\n"
    (METRIC_DIR / f"{metric}.prom").write_text(metric_line)


def _checksum(path: Path) -> str:
    sha = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8192), b""):
            sha.update(chunk)
    return sha.hexdigest()


def _write_manifest(store: str, artifact: Path, checksum: str) -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {
        "store": store,
        "artifact": str(artifact),
        "checksum": checksum,
        "created_at": _timestamp(),
    }
    manifest_path = ARTIFACT_DIR / f"{store}-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2))


def _simulate_write(store: str) -> Path:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    artifact_path = ARTIFACT_DIR / f"{store}-{int(time.time())}.bak"
    artifact_path.write_text(f"backup for {store} at {_timestamp()}\n")
    return artifact_path


def _backup_postgres() -> Path:
    return _simulate_write("postgres")


def _verify_postgres(path: Path) -> bool:
    return path.exists() and path.stat().st_size > 0


def _backup_neo4j() -> Path:
    return _simulate_write("neo4j")


def _verify_neo4j(path: Path) -> bool:
    return path.exists()


def _backup_redis() -> Path:
    return _simulate_write("redis")


def _verify_redis(path: Path) -> bool:
    return path.exists()


def _backup_typesense() -> Path:
    return _simulate_write("typesense")


def _verify_typesense(path: Path) -> bool:
    return path.exists()


def build_targets() -> list[BackupTarget]:
    return [
        BackupTarget("postgres", _backup_postgres, _verify_postgres),
        BackupTarget("neo4j", _backup_neo4j, _verify_neo4j),
        BackupTarget("redis", _backup_redis, _verify_redis),
        BackupTarget("typesense", _backup_typesense, _verify_typesense),
    ]


def run_backup(store: str) -> Path:
    targets = {t.name: t for t in build_targets()}
    target = targets.get(store)
    if not target:
        raise SystemExit(f"unknown store: {store}")
    start = time.time()
    artifact = target.backup_fn()
    duration = time.time() - start
    checksum = _checksum(artifact)
    _write_manifest(store, artifact, checksum)
    _write_metric("backup_bytes_total", artifact.stat().st_size, {"store": store})
    _write_metric("backup_duration_seconds", duration, {"store": store})
    _write_metric("backup_last_success_timestamp", time.time(), {"store": store})
    print(f"backup completed for {store}: {artifact} ({duration:.2f}s)")
    return artifact


def run_verify(store: str, artifact: Path | None) -> bool:
    targets = {t.name: t for t in build_targets()}
    target = targets.get(store)
    if not target:
        raise SystemExit(f"unknown store: {store}")
    if artifact is None:
        candidates = sorted(ARTIFACT_DIR.glob(f"{store}-*.bak"), reverse=True)
        if not candidates:
            raise SystemExit(f"no artifacts found for {store}")
        artifact = candidates[0]
    ok = target.verify_fn(artifact)
    _write_metric("backup_verify_success", 1 if ok else 0, {"store": store})
    print(f"verify {'passed' if ok else 'failed'} for {store}: {artifact}")
    return ok


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backup orchestrator")
    sub = parser.add_subparsers(dest="command", required=True)

    backup_parser = sub.add_parser("backup", help="run backup")
    backup_parser.add_argument("store", choices=[t.name for t in build_targets()])

    verify_parser = sub.add_parser("verify", help="verify backup")
    verify_parser.add_argument("store", choices=[t.name for t in build_targets()])
    verify_parser.add_argument("--artifact", type=Path, help="optional artifact path")

    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if args.command == "backup":
        run_backup(args.store)
        return 0
    if args.command == "verify":
        result = run_verify(args.store, args.artifact)
        return 0 if result else 1
    return 1


if __name__ == "__main__":
    sys.exit(main())
