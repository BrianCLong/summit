#!/usr/bin/env python3
import argparse
import json
import os
import re
import shutil
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Iterable

REPO_ROOT = Path(__file__).resolve().parents[2]
DOCS_ROOT = REPO_ROOT / "docs"
META_DIR = DOCS_ROOT / "_meta"

MD_EXTS = {".md", ".markdown", ".mdx", ".txt"}

# Patterns to find action items
CHECKBOX_RE = re.compile(r"^[\s>*-]*\[ \]\s+(?P<text>.+)$", re.MULTILINE)
CHECKEDBOX_RE = re.compile(r"^[\s>*-]*\[[xX]\]\s+(?P<text>.+)$", re.MULTILINE)
TODO_INLINE_RE = re.compile(r"(?i)\bTODO\s*[:\-]?\s*(?P<text>[^\n]+)")

# Headings likely to contain action lists; we capture following bullet items until next heading of same or higher level
HEADING_RE = re.compile(r"^(?P<hashes>#{1,6})\s+(?P<title>.+)$", re.MULTILINE)
# Capture bullets starting with -, *, +, >*, or numbered lists like 1. 2.
BULLET_RE = re.compile(r"^[\s>]*(?:[-*+]|\d+\.)\s+(?P<text>.+)$", re.MULTILINE)

ACTION_HEADING_HINTS = re.compile(
    r"(?i)^(next steps|actions?|action items|open items|open questions|follow[- ]?ups|to ?dos?|backlog|risks|mitigations|dependencies|assumptions|owners|work items|tasks?)\b"
)

# Heuristic label mapping by path segments
AREA_LABELS = [
    (re.compile(r"/security/"), "area:security"),
    (re.compile(r"/releases?/"), "area:release"),
    (re.compile(r"/runbooks?/"), "area:runbook"),
    (re.compile(r"/operations?/"), "area:operations"),
    (re.compile(r"/product/"), "area:product"),
    (re.compile(r"/plans?/"), "area:planning"),
    (re.compile(r"/reports?/"), "area:report"),
    (re.compile(r"/architecture/"), "area:architecture"),
    (re.compile(r"/research/"), "area:research"),
]

DEFAULT_LABELS = ["from-docs", "type:doc-action", "triage-needed"]


def iter_doc_files(base: Path) -> Iterable[Path]:
    for path in base.rglob("*"):
        if path.is_file() and path.suffix.lower() in MD_EXTS:
            yield path


def anchor_for_heading(title: str) -> str:
    # GitHub-style anchor approximation
    anchor = title.strip().lower()
    anchor = re.sub(r"[\s]+", "-", anchor)
    anchor = re.sub(r"[^a-z0-9\-]", "", anchor)
    return anchor


def parse_actions_from_text(text: str) -> Dict[str, List[Dict[str, str]]]:
    actions: Dict[str, List[Dict[str, str]]] = {
        "checkboxes": [],
        "checked": [],
        "todos": [],
        "heading_lists": [],
    }

    for m in CHECKBOX_RE.finditer(text):
        actions["checkboxes"].append({"text": m.group("text").strip()})

    for m in CHECKEDBOX_RE.finditer(text):
        actions["checked"].append({"text": m.group("text").strip()})

    for m in TODO_INLINE_RE.finditer(text):
        actions["todos"].append({"text": m.group("text").strip()})

    # Capture bullets under action-oriented headings
    for hm in HEADING_RE.finditer(text):
        title = hm.group("title").strip()
        if not ACTION_HEADING_HINTS.search(title):
            continue
        level = len(hm.group("hashes"))
        start = hm.end()
        # find next heading of same or higher level
        next_h = None
        for hm2 in HEADING_RE.finditer(text, pos=start):
            if len(hm2.group("hashes")) <= level:
                next_h = hm2.start()
                break
        section = text[start: next_h] if next_h is not None else text[start:]
        items = [m.group("text").strip() for m in BULLET_RE.finditer(section)]
        if items:
            actions["heading_lists"].append({"heading": title, "items": items})

    return actions


def labels_for_path(repo_rel: str) -> List[str]:
    labels = list(DEFAULT_LABELS)
    for pattern, label in AREA_LABELS:
        if pattern.search("/" + repo_rel.replace(os.sep, "/") + "/"):
            labels.append(label)
    return sorted(set(labels))


def create_issue(repo: str, title: str, body: str, labels: List[str]) -> Optional[str]:
    if shutil.which("gh") is None:
        print("gh CLI not found; skipping issue creation")
        return None
    cmd = [
        "gh", "issue", "create",
        "--repo", repo,
        "--title", title,
        "--body", body,
    ]
    for l in labels:
        cmd.extend(["--label", l])
    try:
        out = subprocess.check_output(cmd, text=True)
        url = out.strip()
        return url
    except subprocess.CalledProcessError as e:
        print(f"Failed to create issue: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(description="Extract action items from docs and optionally create GitHub issues.")
    parser.add_argument("--base", default=str(DOCS_ROOT), help="Docs base directory to scan")
    parser.add_argument("--output", default=str(META_DIR / "extracted-actions.json"), help="Output JSON path")
    parser.add_argument("--create-issues", action="store_true", help="Create GitHub issues for each action")
    parser.add_argument("--repo", default=os.environ.get("GITHUB_REPO"), help="owner/repo for issue creation (or set GITHUB_REPO)")
    args = parser.parse_args()

    base = Path(args.base)
    META_DIR.mkdir(parents=True, exist_ok=True)

    # Auto-detect repo if not provided
    if args.create_issues and not args.repo:
        repo = None
        try:
            out = subprocess.check_output(["gh", "repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"], text=True)
            repo = out.strip() or None
        except Exception:
            pass
        if not repo:
            try:
                origin_url = subprocess.check_output(["git", "remote", "get-url", "origin"], text=True).strip()
                m = re.search(r"github.com[:/]{1}([^/]+/[^/.]+)", origin_url)
                if m:
                    repo = m.group(1)
            except Exception:
                pass
        if not repo:
            raise SystemExit("--create-issues requested but repo is unknown; set --repo or GITHUB_REPO")
        args.repo = repo

    results: List[Dict[str, object]] = []

    for p in iter_doc_files(base):
        rel = os.path.relpath(p, REPO_ROOT)
        text = p.read_text(encoding="utf-8", errors="ignore")
        actions = parse_actions_from_text(text)
        # Flatten actionable items
        all_items: List[Tuple[str, Optional[str]]] = []
        for it in actions["checkboxes"]:
            all_items.append((it["text"], None))
        for it in actions["todos"]:
            all_items.append((it["text"], None))
        for section in actions["heading_lists"]:
            heading = section["heading"]
            for item in section["items"]:
                all_items.append((item, heading))

        entry = {
            "file": rel,
            "counts": {
                "checkboxes": len(actions["checkboxes"]),
                "checked": len(actions["checked"]),
                "todos": len(actions["todos"]),
                "heading_lists": sum(len(s["items"]) for s in actions["heading_lists"]),
            },
            "items": [
                {"text": t, "section": h} for (t, h) in all_items
            ],
        }
        results.append(entry)

        # Optionally create issues
        if args.create_issues and all_items:
            labels = labels_for_path(rel)
            for (text_item, heading) in all_items:
                anchor = anchor_for_heading(heading) if heading else None
                url = f"{rel}"
                if anchor:
                    url += f"#{anchor}"
                title = text_item
                body = f"Source: `{rel}`\n\nAction: {text_item}\n\nSection: {heading or 'N/A'}"
                create_issue(args.repo, title, body, labels)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump({"results": results}, f, indent=2)
    print(f"Wrote action extraction report to {args.output}")

if __name__ == "__main__":
    main()
