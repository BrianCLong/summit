#!/usr/bin/env python3
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Tuple

SCHEMA_ROOT = Path("schemas/registry")


class CompatibilityError(Exception):
    pass


def resolve_base_ref() -> str:
    env_ref = os.environ.get("GITHUB_BASE_REF")
    if env_ref:
        return env_ref
    try:
        subprocess.run(
            ["git", "show-ref", "--verify", "refs/heads/main"],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return "main"
    except subprocess.CalledProcessError:
        return "HEAD~1"


def list_changed_schema_files(base_ref: str) -> List[Path]:
    diff_cmd = ["git", "diff", "--name-only", f"{base_ref}...HEAD", str(SCHEMA_ROOT)]
    result = subprocess.run(diff_cmd, capture_output=True, text=True, check=True)
    paths = [Path(line.strip()) for line in result.stdout.splitlines() if line.strip()]
    return [p for p in paths if p.name == "schema.json"]


def load_schema(path: Path, ref: str | None = None) -> Dict:
    if ref:
        content = subprocess.check_output(["git", "show", f"{ref}:{path}"])
        return json.loads(content)
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def parse_versions(dataset_dir: Path) -> List[Tuple[int, Path]]:
    versions: List[Tuple[int, Path]] = []
    for child in dataset_dir.iterdir():
        if child.is_dir() and child.name.startswith("v"):
            try:
                versions.append((int(child.name[1:]), child / "schema.json"))
            except ValueError:
                continue
    return sorted(versions)


def compare_schemas(base: Dict, new: Dict) -> List[str]:
    errors: List[str] = []
    base_props = base.get("properties", {})
    new_props = new.get("properties", {})

    for prop, base_schema in base_props.items():
        if prop not in new_props:
            errors.append(f"property removed: {prop}")
            continue
        base_type = base_schema.get("type")
        new_type = new_props[prop].get("type")
        if _normalize_type(base_type) != _normalize_type(new_type):
            errors.append(f"type changed for {prop}: {base_type} -> {new_type}")

    base_required = set(base.get("required", []))
    new_required = set(new.get("required", []))
    missing_required = base_required - new_required
    if missing_required:
        errors.append(f"required fields dropped: {sorted(missing_required)}")

    newly_required = new_required - base_required
    if newly_required:
        errors.append(f"new required fields added: {sorted(newly_required)}")

    return errors


def _normalize_type(type_value):
    if isinstance(type_value, list):
        return sorted(type_value)
    return type_value


def check_file(path: Path, base_ref: str) -> None:
    relative = path.relative_to(Path.cwd()) if path.is_absolute() else path
    try:
        base_schema = load_schema(relative, base_ref)
    except subprocess.CalledProcessError:
        dataset_dir = relative.parent
        versions = parse_versions(dataset_dir.parent)
        current_version = relative.parent.name
        previous_versions = [v for v in versions if f"v{v[0]}" != current_version and v[0] < int(current_version[1:])]
        if not previous_versions:
            print(f"[ok] {relative}: first version detected; skipping comparison")
            return
        _, previous_path = previous_versions[-1]
        base_schema = load_schema(previous_path)

    new_schema = load_schema(relative)
    errors = compare_schemas(base_schema, new_schema)
    if errors:
        raise CompatibilityError(f"{relative} is incompatible: {errors}")
    print(f"[ok] {relative}: compatible with base")


def main() -> int:
    base_ref = resolve_base_ref()
    try:
        changed_files = list_changed_schema_files(base_ref)
    except subprocess.CalledProcessError as exc:
        print(f"Failed to diff schemas: {exc}")
        return 1

    if not changed_files:
        print("No schema changes detected. Skipping compatibility checks.")
        return 0

    failures: List[str] = []
    for path in changed_files:
        try:
            check_file(path, base_ref)
        except CompatibilityError as err:
            failures.append(str(err))

    if failures:
        print("\nSchema compatibility failures detected:")
        for failure in failures:
            print(f" - {failure}")
        return 1

    print("All schema changes are backward compatible.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
