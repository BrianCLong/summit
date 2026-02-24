#!/usr/bin/env python3
"""ga-merge-report.py -- Categorize Summit GA PRs into tiers and generate a Markdown report.

Reads /tmp/all_prs.tsv (or path from --tsv flag).
Format: number|title|draft/ready|base|head_branch|author|labels|created|updated

Outputs a detailed Markdown report to stdout.
"""

import argparse
import re
import sys
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime


@dataclass
class PullRequest:
    number: int
    title: str
    status: str
    base: str
    head_branch: str
    author: str
    labels: str
    created: str
    updated: str
    tier: int = 0
    tier_name: str = ""


TIER_NAMES = {
    1: "Dependabot / Dependencies",
    2: "Documentation",
    3: "Tests / Coverage",
    4: "Chore / CI / Infra",
    5: "Bug Fixes",
    6: "Features",
    7: "Security / Governance (manual review)",
}

TIER_RULES: list[tuple[int, list[tuple[str, str]]]] = [
    (7, [
        ("title", r"(?i)(security|sentinel|cve-\d|vuln|harden.*auth|rbac|threat model|permission.*(fix|change)|crypto)"),
        ("labels", r"(?i)security"),
        ("branch", r"(?i)(security|sentinel|cve-)"),
    ]),
    (1, [
        ("labels", r"(?i)dependencies"),
        ("branch", r"(?i)(dependabot|dependency|deps/)"),
        ("title", r"(?i)(^bump |^chore\(deps\)|^build\(deps\)|update.*dependen)"),
    ]),
    (2, [
        ("title", r"(?i)^docs?[:(]"),
        ("branch", r"(?i)^docs/"),
    ]),
    (3, [
        ("title", r"(?i)(^tests?[:(s]|testing suite|coverage pipeline|^coverage)"),
        ("branch", r"(?i)(^test/|/test-|test-suite|coverage)"),
    ]),
    (4, [
        ("title", r"(?i)(^chore[:(]|^ci[:(]|^ci/|^infra[:(]|^build[:(])"),
        ("branch", r"(?i)(^chore/|^ci/|^infra/)"),
    ]),
    (5, [
        ("title", r"(?i)(^fix[:(]|^bugfix|^hotfix)"),
        ("branch", r"(?i)(^fix/|^bugfix/|^hotfix/)"),
    ]),
]


def classify(pr: PullRequest) -> int:
    field_map = {"title": pr.title, "labels": pr.labels, "branch": pr.head_branch}
    for tier, rules in TIER_RULES:
        for fld, pattern in rules:
            if re.search(pattern, field_map.get(fld, "")):
                return tier
    return 6


def load_prs(tsv_path: str) -> list[PullRequest]:
    prs: list[PullRequest] = []
    with open(tsv_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split("|")
            if len(parts) < 9:
                parts += [""] * (9 - len(parts))
            try:
                number = int(parts[0].strip())
            except ValueError:
                continue
            pr = PullRequest(
                number=number,
                title=parts[1].strip(),
                status=parts[2].strip(),
                base=parts[3].strip(),
                head_branch=parts[4].strip(),
                author=parts[5].strip(),
                labels=parts[6].strip(),
                created=parts[7].strip(),
                updated=parts[8].strip(),
            )
            pr.tier = classify(pr)
            pr.tier_name = TIER_NAMES.get(pr.tier, "Unknown")
            prs.append(pr)
    return prs


def generate_report(prs: list[PullRequest]) -> str:
    lines: list[str] = []
    total = len(prs)
    ready = [p for p in prs if p.status == "ready"]
    drafts = [p for p in prs if p.status == "draft"]
    by_tier: dict[int, list[PullRequest]] = defaultdict(list)
    for pr in prs:
        by_tier[pr.tier].append(pr)
    by_author: dict[str, int] = defaultdict(int)
    for pr in prs:
        by_author[pr.author] += 1
    by_label: dict[str, int] = defaultdict(int)
    for pr in prs:
        if pr.labels:
            for lbl in pr.labels.split(","):
                lbl = lbl.strip()
                if lbl:
                    by_label[lbl] += 1
        else:
            by_label["(no label)"] += 1
    dates = [p.created for p in prs if p.created]
    date_min = min(dates) if dates else "N/A"
    date_max = max(dates) if dates else "N/A"

    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    lines.append("# GA Merge Train -- PR Assessment Report")
    lines.append("")
    lines.append(f"Generated: {now}")
    lines.append("")
    lines.append("## Overview")
    lines.append("")
    lines.append("| Metric | Count |")
    lines.append("|--------|------:|")
    lines.append(f"| Total PRs | {total} |")
    lines.append(f"| Ready to merge | {len(ready)} |")
    lines.append(f"| Draft (skipped) | {len(drafts)} |")
    lines.append(f"| Date range | {date_min} to {date_max} |")
    lines.append("")
    lines.append("## Tier Breakdown")
    lines.append("")
    lines.append("| Tier | Category | Ready | Draft | Total | % of Total |")
    lines.append("|-----:|----------|------:|------:|------:|-----------:|")
    for t in range(1, 8):
        tier_prs = by_tier.get(t, [])
        t_ready = sum(1 for p in tier_prs if p.status == "ready")
        t_draft = sum(1 for p in tier_prs if p.status == "draft")
        t_total = len(tier_prs)
        pct = (t_total / total * 100) if total > 0 else 0
        lines.append(f"| {t} | {TIER_NAMES[t]} | {t_ready} | {t_draft} | {t_total} | {pct:.1f}% |")
    lines.append("")
    lines.append("## Recommended Merge Order")
    lines.append("")
    lines.append("1. **Tier 1** -- Dependabot / dependency bumps (lowest risk)")
    lines.append("2. **Tier 2** -- Documentation-only (no code changes)")
    lines.append("3. **Tier 3** -- Tests / coverage (improves safety net)")
    lines.append("4. **Tier 4** -- Chore / CI / infra (build system, tooling)")
    lines.append("5. **Tier 5** -- Bug fixes (targeted code changes)")
    lines.append("6. **Tier 6** -- Features (new functionality, highest conflict risk)")
    lines.append("7. **Tier 7** -- Security / governance (MANUAL REVIEW required)")
    lines.append("")

    batch_size = 50
    total_ready = len(ready)
    batches = (total_ready + batch_size - 1) // batch_size
    lines.append("## Estimated Merge Effort")
    lines.append("")
    lines.append(f"- Ready PRs to merge: **{total_ready}**")
    lines.append(f"- Batch size (CI pause interval): **{batch_size}**")
    lines.append(f"- Estimated batches: **{batches}**")
    lines.append("")

    for t in range(1, 8):
        tier_prs = by_tier.get(t, [])
        if not tier_prs:
            continue
        t_ready = [p for p in tier_prs if p.status == "ready"]
        lines.append(f"## Tier {t}: {TIER_NAMES[t]} ({len(t_ready)} ready, {len(tier_prs)} total)")
        lines.append("")
        if t == 7:
            lines.append("> **WARNING**: These PRs touch security, governance, or sensitive areas.")
            lines.append("> Each must be reviewed manually before merging.")
            lines.append("")
        display_prs = t_ready[:50]
        if len(t_ready) > 50:
            lines.append(f"*Showing first 50 of {len(t_ready)} ready PRs:*")
            lines.append("")
        lines.append("| PR # | Title | Author | Labels | Updated |")
        lines.append("|-----:|-------|--------|--------|---------|")
        for pr in display_prs:
            safe_title = pr.title.replace("|", "\\|")[:80]
            labels_short = pr.labels[:30] if pr.labels else "-"
            lines.append(f"| #{pr.number} | {safe_title} | {pr.author} | {labels_short} | {pr.updated} |")
        if len(t_ready) > 50:
            lines.append(f"| ... | *({len(t_ready) - 50} more PRs)* | | | |")
        lines.append("")

    lines.append("## Author Distribution")
    lines.append("")
    lines.append("| Author | PR Count |")
    lines.append("|--------|--------:|")
    for author, count in sorted(by_author.items(), key=lambda x: -x[1]):
        lines.append(f"| {author} | {count} |")
    lines.append("")

    lines.append("## Risk Notes")
    lines.append("")
    lines.append("- **Merge conflicts**: PRs are merged oldest-first within each tier to minimize conflicts.")
    lines.append("- **CI validation**: The merge train pauses every 50 merges. Verify CI is green before continuing.")
    lines.append("- **Rollback**: Each merge report records the SHA of every squash-merge commit.")
    lines.append("- **Tier 7**: Security and governance PRs require manual code review before merging.")
    lines.append("")

    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate GA PR merge tier report.")
    parser.add_argument("--tsv", default="/tmp/all_prs.tsv", help="Path to PR TSV file")
    parser.add_argument("--json", action="store_true", help="Also output JSON summary to stderr")
    args = parser.parse_args()

    try:
        prs = load_prs(args.tsv)
    except FileNotFoundError:
        print(f"ERROR: File not found: {args.tsv}", file=sys.stderr)
        sys.exit(1)

    if not prs:
        print("WARNING: No PRs loaded.", file=sys.stderr)
        sys.exit(0)

    print(generate_report(prs))

    if args.json:
        import json
        by_tier: dict[int, list[dict]] = defaultdict(list)
        for pr in prs:
            by_tier[pr.tier].append({"number": pr.number, "title": pr.title, "status": pr.status})
        summary = {
            "total": len(prs),
            "ready": sum(1 for p in prs if p.status == "ready"),
            "draft": sum(1 for p in prs if p.status == "draft"),
            "tiers": {
                str(t): {"name": TIER_NAMES[t], "count": len(by_tier.get(t, [])),
                          "ready": sum(1 for p in by_tier.get(t, []) if p["status"] == "ready")}
                for t in range(1, 8)
            },
        }
        print(json.dumps(summary, indent=2), file=sys.stderr)


if __name__ == "__main__":
    main()
