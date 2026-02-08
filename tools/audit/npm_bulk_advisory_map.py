#!/usr/bin/env python3
"""Map npm bulk advisories to pnpm-lock entries and importers."""

from __future__ import annotations

import argparse
import json
from functools import cmp_to_key
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Set, Tuple

import yaml


@dataclass(frozen=True)
class SemVer:
    major: int
    minor: int
    patch: int
    pre: Tuple[str, ...]


def _parse_semver(value: str) -> Optional[SemVer]:
    if not value:
        return None
    v = value.strip()
    if v.startswith("v"):
        v = v[1:]
    # strip build metadata
    if "+" in v:
        v = v.split("+", 1)[0]
    pre: Tuple[str, ...] = ()
    if "-" in v:
        base, pre_str = v.split("-", 1)
        pre = tuple(p for p in pre_str.split(".") if p)
    else:
        base = v
    parts = base.split(".")
    if any(not p.isdigit() for p in parts):
        return None
    nums = [int(p) for p in parts]
    while len(nums) < 3:
        nums.append(0)
    return SemVer(nums[0], nums[1], nums[2], pre)


def _cmp_ident(a: str, b: str) -> int:
    a_num = a.isdigit()
    b_num = b.isdigit()
    if a_num and b_num:
        ai = int(a)
        bi = int(b)
        return -1 if ai < bi else (1 if ai > bi else 0)
    if a_num and not b_num:
        return -1
    if not a_num and b_num:
        return 1
    if a < b:
        return -1
    if a > b:
        return 1
    return 0


def _cmp_semver(a: SemVer, b: SemVer) -> int:
    if (a.major, a.minor, a.patch) != (b.major, b.minor, b.patch):
        return -1 if (a.major, a.minor, a.patch) < (b.major, b.minor, b.patch) else 1
    if not a.pre and not b.pre:
        return 0
    if not a.pre and b.pre:
        return 1
    if a.pre and not b.pre:
        return -1
    for i in range(max(len(a.pre), len(b.pre))):
        if i >= len(a.pre):
            return -1
        if i >= len(b.pre):
            return 1
        cmp_id = _cmp_ident(a.pre[i], b.pre[i])
        if cmp_id != 0:
            return cmp_id
    return 0


def _cmp_semver_str(a: str, b: str) -> int:
    sa = _parse_semver(a)
    sb = _parse_semver(b)
    if sa is None and sb is None:
        return -1 if a < b else (1 if a > b else 0)
    if sa is None:
        return -1
    if sb is None:
        return 1
    return _cmp_semver(sa, sb)


def _normalize_version(value: str) -> Optional[str]:
    if not isinstance(value, str):
        return None
    v = value.strip()
    if not v:
        return None
    if v.startswith(("link:", "workspace:", "file:", "http:", "https:", "git+", "patch:")):
        return None
    if v.startswith("npm:"):
        v = v[4:]
    if "(" in v:
        v = v.split("(", 1)[0]
    if v.startswith("v"):
        v = v[1:]
    return v if v else None


def _split_or(range_str: str) -> List[str]:
    return [part.strip() for part in range_str.split("||") if part.strip()]


def _parse_range_part(part: str) -> List[Tuple[str, str]]:
    if part in ("*", ""):
        return []
    if " - " in part:
        left, right = [p.strip() for p in part.split(" - ", 1)]
        return [(">=", left), ("<=", right)]
    tokens = part.split()
    comps: List[Tuple[str, str]] = []
    for token in tokens:
        for op in (">=", "<=", ">", "<", "="):
            if token.startswith(op):
                comps.append((op, token[len(op) :]))
                break
        else:
            comps.append(("=", token))
    return comps


def _satisfies(version: str, range_str: str) -> bool:
    v = _parse_semver(version)
    if v is None:
        return False
    if not range_str or range_str.strip() in ("*", ""):
        return True
    for part in _split_or(range_str):
        comps = _parse_range_part(part)
        ok = True
        for op, raw in comps:
            target = _parse_semver(raw)
            if target is None:
                ok = False
                break
            cmp_v = _cmp_semver(v, target)
            if op == ">=" and cmp_v < 0:
                ok = False
            elif op == ">" and cmp_v <= 0:
                ok = False
            elif op == "<=" and cmp_v > 0:
                ok = False
            elif op == "<" and cmp_v >= 0:
                ok = False
            elif op == "=" and cmp_v != 0:
                ok = False
        if ok:
            return True
    return False


def _split_key(key: str) -> Tuple[str, str]:
    if key.startswith("/"):
        key = key[1:]
    if key.startswith("@"):
        name, ver = key.rsplit("@", 1)
    else:
        name, ver = key.split("@", 1)
    return name, ver


def _collect_deps(dep_maps: Iterable[Optional[Dict]]) -> Dict[str, str]:
    deps: Dict[str, str] = {}
    for dep_map in dep_maps:
        if not isinstance(dep_map, dict):
            continue
        for name, value in dep_map.items():
            if isinstance(value, dict):
                version = value.get("version")
            else:
                version = value
            normalized = _normalize_version(str(version)) if version is not None else None
            if normalized:
                deps[name] = normalized
    return deps


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lock", default="pnpm-lock.yaml")
    parser.add_argument("--bulk", default="/tmp/pnpm-audit/bulk-full.json")
    parser.add_argument("--out-json", default="docs/audit/npm_bulk_advisory_report.json")
    parser.add_argument("--out-md", default="docs/audit/npm_bulk_advisory_report.md")
    args = parser.parse_args()

    lock_path = Path(args.lock)
    bulk_path = Path(args.bulk)

    lock = yaml.safe_load(lock_path.read_text())
    bulk = json.loads(bulk_path.read_text())

    packages = lock.get("packages", {})
    importers = lock.get("importers", {})

    node_for: Dict[Tuple[str, str], str] = {}
    versions_for: Dict[str, Set[str]] = {}
    deps_for: Dict[str, Dict[str, str]] = {}

    for key, meta in packages.items():
        name, ver = _split_key(key)
        versions_for.setdefault(name, set()).add(ver)
        node_id = f"{name}@{ver}"
        node_for[(name, ver)] = node_id
        deps_for[node_id] = _collect_deps(
            [
                meta.get("dependencies"),
                meta.get("optionalDependencies"),
                meta.get("peerDependencies"),
            ]
        )

    reverse_deps: Dict[str, Set[str]] = {}
    for node_id, deps in deps_for.items():
        for dep_name, dep_ver in deps.items():
            dep_node = node_for.get((dep_name, dep_ver))
            if not dep_node:
                continue
            reverse_deps.setdefault(dep_node, set()).add(node_id)

    direct_importers: Dict[str, Set[str]] = {}
    for importer, meta in importers.items():
        deps = _collect_deps(
            [
                meta.get("dependencies"),
                meta.get("devDependencies"),
                meta.get("optionalDependencies"),
                meta.get("peerDependencies"),
            ]
        )
        for dep_name, dep_ver in deps.items():
            node_id = node_for.get((dep_name, dep_ver))
            if not node_id:
                continue
            direct_importers.setdefault(node_id, set()).add(importer)

    importer_cache: Dict[str, Set[str]] = {}

    def collect_importers(node_id: str) -> Set[str]:
        if node_id in importer_cache:
            return importer_cache[node_id]
        seen: Set[str] = set()
        stack = [node_id]
        importers_found: Set[str] = set()
        while stack:
            current = stack.pop()
            if current in seen:
                continue
            seen.add(current)
            importers_found.update(direct_importers.get(current, set()))
            for parent in reverse_deps.get(current, set()):
                if parent not in seen:
                    stack.append(parent)
        importer_cache[node_id] = importers_found
        return importers_found

    advisories = bulk.get("advisories", [])
    grouped: Dict[str, List[Dict]] = {}
    for adv in advisories:
        grouped.setdefault(adv["package"], []).append(adv)

    report_packages: Dict[str, Dict] = {}
    total_affected_versions = 0
    total_affected_importers: Set[str] = set()

    for pkg, advs in grouped.items():
        locked_versions = sorted(
            versions_for.get(pkg, set()),
            key=cmp_to_key(_cmp_semver_str),
        )
        pkg_entry = {
            "locked_versions": locked_versions,
            "advisories": [],
        }
        for adv in advs:
            vuln_range = adv.get("vulnerable_versions", "")
            affected = [v for v in locked_versions if _satisfies(v, vuln_range)]
            affected_nodes = [node_for[(pkg, v)] for v in affected if (pkg, v) in node_for]
            importers_hit: Set[str] = set()
            for node_id in affected_nodes:
                importers_hit.update(collect_importers(node_id))
            total_affected_versions += len(affected)
            total_affected_importers.update(importers_hit)
            pkg_entry["advisories"].append(
                {
                    "id": adv.get("id"),
                    "title": adv.get("title"),
                    "severity": adv.get("severity"),
                    "url": adv.get("url"),
                    "vulnerable_versions": vuln_range,
                    "affected_versions": affected,
                    "affected_nodes": affected_nodes,
                    "importers": sorted(importers_hit),
                    "recommended_action": (
                        "Upgrade to a version outside the vulnerable range "
                        f"({vuln_range or 'range not specified'})."
                    ),
                }
            )
        report_packages[pkg] = pkg_entry

    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "lockfile": str(lock_path),
        "bulk_source": str(bulk_path),
        "total_advisories": len(advisories),
        "packages_with_advisories": len(report_packages),
        "total_affected_versions": total_affected_versions,
        "total_affected_importers": len(total_affected_importers),
    }

    out_json = Path(args.out_json)
    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_json.write_text(
        json.dumps(
            {"summary": summary, "packages": report_packages},
            indent=2,
            sort_keys=True,
        )
        + "\n"
    )

    out_md = Path(args.out_md)
    lines = [
        "# NPM bulk advisory report",
        "",
        f"- Generated: {summary['generated_at']}",
        f"- Lockfile: `{summary['lockfile']}`",
        f"- Advisories: {summary['total_advisories']}",
        f"- Packages with advisories: {summary['packages_with_advisories']}",
        f"- Affected versions: {summary['total_affected_versions']}",
        f"- Affected importers: {summary['total_affected_importers']}",
        "",
    ]
    for pkg in sorted(report_packages.keys()):
        entry = report_packages[pkg]
        lines.append(f"## {pkg}")
        if not entry["advisories"]:
            lines.append("")
            continue
        for adv in entry["advisories"]:
            lines.append(f"- {adv['title']} ({adv['severity']})")
            lines.append(f"  - ID: {adv['id']}")
            lines.append(f"  - Range: `{adv['vulnerable_versions']}`")
            lines.append(f"  - Affected versions: {', '.join(adv['affected_versions']) or 'None'}")
            lines.append(f"  - Importers: {', '.join(adv['importers']) or 'None'}")
            lines.append(f"  - Recommended: {adv['recommended_action']}")
        lines.append("")
    out_md.write_text("\n".join(lines) + "\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
