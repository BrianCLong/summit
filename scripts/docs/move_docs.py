#!/usr/bin/env python3
import argparse
import json
import os
import re
import subprocess
from pathlib import Path
from typing import Dict, List, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]
DOCS_ROOT = REPO_ROOT / "docs"
META_DIR = DOCS_ROOT / "_meta"

# Heuristic routing rules based on filename keywords
CATEGORY_RULES: List[Tuple[str, str]] = [
    # Standards
    (r"(?i)contributing|code_of_conduct|repository-structure|engineering_standard", "standards"),
    # Releases
    (r"(?i)changelog|release|ga[-_ ]plan|ga[-_ ]readiness|launch", "releases"),
    # Runbooks
    (r"(?i)runbook|go[-_ ]live|cutover|dr\b|playbook", "runbooks"),
    # Operations
    (r"(?i)deploy|readiness|operational|operations|infra|kubernetes", "operations"),
    # Security
    (r"(?i)security|threatmodel|hardening|compliance|trust|privacy", "security"),
    # Product PRDs / Specs / Templates
    (r"(?i)\bprd\b|product\b|ui[-_ ]spec|spec\b|template\b", "product"),
    # Plans
    (r"(?i)plan|sprint|merge[-_ ]?train|merge[-_ ]plan|roadmap|next", "plans"),
    # Reports (bugs, performance, validation, completion)
    (r"(?i)bug[-_ ]bash|report|validation|perf|performance|summary|certificate|completion|observ(ation|ability)", "reports"),
    # Architecture
    (r"(?i)architecture|ecosystem|overview|standard_v\d+", "architecture"),
    # Research
    (r"(?i)competitive|market|strategy|research|whitepaper", "research"),
    # Misc
    (r"(?i)announcement|announce|news", "misc"),
]

PRODUCT_SUBRULES: List[Tuple[str, str]] = [
    (r"(?i)\bprd\b|platform PRD|PRD", "prd"),
    (r"(?i)spec\b|ui[-_ ]spec|api[-_ ]spec", "specs"),
    (r"(?i)template", "templates"),
]

REPORTS_SUBRULES: List[Tuple[str, str]] = [
    (r"(?i)perf|performance|k6|latency|baseline", "perf"),
]

PLANS_SUBRULES: List[Tuple[str, str]] = [
    (r"(?i)sprint", "sprints"),
]

AMBIGUOUS_PLACEMENTS: Dict[str, str] = {
    "INTELGRAPH_ENGINEERING_STANDARD_V4.md": "standards",
    "UI.md": "product/specs",
}

SKIP_FILES = {
    "README.md",   # keep at root
    "LICENSE",     # keep at root
    "SECURITY.md", # keep at root for GitHub security policy
}

DOC_EXTS = {".md", ".markdown", ".mdx", ".txt"}


def infer_category(relname: str) -> Tuple[str, str]:
    name = relname
    # Explicit ambiguous placements
    if name in AMBIGUOUS_PLACEMENTS:
        return AMBIGUOUS_PLACEMENTS[name], "ambiguous-rule"

    # Rule-based categorization
    for pattern, category in CATEGORY_RULES:
        if re.search(pattern, name):
            # Try subcategory rules
            sub = None
            if category == "product":
                for sp, sc in PRODUCT_SUBRULES:
                    if re.search(sp, name):
                        sub = sc; break
            elif category == "reports":
                for sp, sc in REPORTS_SUBRULES:
                    if re.search(sp, name):
                        sub = sc; break
            elif category == "plans":
                for sp, sc in PLANS_SUBRULES:
                    if re.search(sp, name):
                        sub = sc; break
            return f"{category}/{sub}" if sub else category, pattern

    return "misc", "fallback"


def discover_root_docs() -> List[Path]:
    items = []
    for entry in REPO_ROOT.iterdir():
        if entry.is_dir():
            continue
        if entry.name in SKIP_FILES:
            continue
        if entry.suffix.lower() in DOC_EXTS:
            items.append(entry)
    return items


def build_mapping(files: List[Path]) -> Dict[str, Dict[str, str]]:
    mapping: Dict[str, Dict[str, str]] = {}
    for f in files:
        category, rule = infer_category(f.name)
        dest_dir = DOCS_ROOT / category
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / f.name
        # Deduplicate: if name exists, add numeric suffix
        i = 1
        final_dest = dest
        while final_dest.exists() and final_dest.resolve() != f.resolve():
            stem = dest.stem
            suffix = dest.suffix
            final_dest = dest_dir / f"{stem}-{i}{suffix}"
            i += 1
        mapping[str(f)] = {
            "to": str(final_dest),
            "category": category,
            "rule": rule,
        }
    return mapping


def apply_moves(mapping: Dict[str, Dict[str, str]], dry_run: bool = True) -> None:
    for src, info in mapping.items():
        dst = info["to"]
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if os.path.abspath(src) == os.path.abspath(dst):
            continue
        if dry_run:
            print(f"DRY-RUN git mv '{src}' '{dst}'")
        else:
            subprocess.check_call(["git", "mv", src, dst])


def write_plan(mapping: Dict[str, Dict[str, str]]) -> Path:
    META_DIR.mkdir(parents=True, exist_ok=True)
    plan_path = META_DIR / "move-plan.json"
    with plan_path.open("w", encoding="utf-8") as f:
        json.dump(mapping, f, indent=2)
    return plan_path


def main():
    parser = argparse.ArgumentParser(description="Discover and move documentation files into docs/ taxonomy.")
    parser.add_argument("--apply", action="store_true", help="Apply the moves using git mv.")
    parser.add_argument("--include-ext", nargs="*", default=[], help="Additional extensions to treat as docs, e.g. .rst")
    args = parser.parse_args()

    if args.include_ext:
        for e in args.include_ext:
            DOC_EXTS.add(e if e.startswith(".") else f".{e}")

    files = discover_root_docs()
    mapping = build_mapping(files)
    plan_path = write_plan(mapping)
    print(f"Wrote move plan to {plan_path}")

    apply_moves(mapping, dry_run=not args.apply)
    if not args.apply:
        print("Dry-run complete. Re-run with --apply to perform moves.")

if __name__ == "__main__":
    main()
