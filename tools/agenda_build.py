#!/usr/bin/env python3
"""
PMI Council/Board Agenda Builder
Automatically generates meeting agendas from GitHub issues and project status.
Integrates with GitHub CLI to pull relevant project items.
"""

import argparse
import datetime
import json
import pathlib
import subprocess
from typing import Any


def run_gh_command(cmd: str) -> list[dict[str, Any]]:
    """Execute GitHub CLI command and return JSON result."""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, check=True)
        return json.loads(result.stdout) if result.stdout.strip() else []
    except subprocess.CalledProcessError as e:
        print(f"Warning: GitHub CLI command failed: {e}")
        print(f"Command: {cmd}")
        print(f"Error: {e.stderr}")
        return []
    except json.JSONDecodeError as e:
        print(f"Warning: Failed to parse JSON from GitHub CLI: {e}")
        return []


def fetch_project_issues() -> dict[str, list[dict[str, Any]]]:
    """Fetch categorized project issues from GitHub."""
    print("Fetching project issues from GitHub...")

    # Define issue categories and their GitHub label queries
    categories = {
        "decisions": "gh issue list --state open --label decision --json number,title,user,labels,updatedAt --limit 10",
        "risks": "gh issue list --state open --label risk --json number,title,user,labels,updatedAt --limit 10",
        "change_requests": "gh issue list --state open --label change-request --json number,title,user,labels,updatedAt --limit 10",
        "blockers": "gh issue list --state open --label blocker --json number,title,user,labels,updatedAt --limit 5",
        "high_priority": 'gh issue list --state open --label "priority: high" --json number,title,user,labels,updatedAt --limit 8',
    }

    results = {}
    for category, command in categories.items():
        issues = run_gh_command(command)
        results[category] = issues[:10]  # Limit to prevent agenda overload

    return results


def format_issue_section(title: str, issues: list[dict[str, Any]], max_items: int = 5) -> str:
    """Format a section of issues for the agenda."""
    if not issues:
        return f"## {title}\n\n*No items in this category*\n"

    lines = [f"## {title}\n"]

    # Sort by update time (most recent first)
    sorted_issues = sorted(issues, key=lambda x: x.get("updatedAt", ""), reverse=True)

    for issue in sorted_issues[:max_items]:
        user = issue.get("user", {}).get("login", "Unknown")
        number = issue.get("number", "?")
        title = issue.get("title", "Untitled")

        # Extract priority/urgency from labels
        labels = issue.get("labels", [])
        priority_labels = [
            l.get("name", "") for l in labels if "priority" in l.get("name", "").lower()
        ]
        urgency = f" [{', '.join(priority_labels)}]" if priority_labels else ""

        lines.append(f"- **#{number}** {title} (@{user}){urgency}")

    if len(issues) > max_items:
        lines.append(f"- *... and {len(issues) - max_items} more items*")

    lines.append("")
    return "\n".join(lines)


def get_sprint_status() -> str:
    """Get current sprint/project status information."""
    # Try to get information from various sources
    status_info = []

    # Check for active PRs
    prs = run_gh_command("gh pr list --state open --json number,title,user,isDraft --limit 5")
    if prs:
        draft_count = sum(1 for pr in prs if pr.get("isDraft", False))
        ready_count = len(prs) - draft_count
        status_info.append(f"**Open PRs**: {ready_count} ready for review, {draft_count} in draft")

    # Check recent releases
    releases = run_gh_command("gh release list --limit 3 --json tagName,publishedAt,isLatest")
    if releases:
        latest = next((r for r in releases if r.get("isLatest")), releases[0] if releases else None)
        if latest:
            release_date = latest.get("publishedAt", "").split("T")[0]
            status_info.append(f"**Latest Release**: {latest.get('tagName')} ({release_date})")

    # Check workflow status (if accessible)
    try:
        workflows = run_gh_command(
            "gh run list --limit 5 --json conclusion,workflowName,createdAt --status completed"
        )
        if workflows:
            failed_count = sum(1 for w in workflows if w.get("conclusion") == "failure")
            if failed_count > 0:
                status_info.append(
                    f"⚠️  **Recent Failures**: {failed_count} workflow failures in last 5 runs"
                )
            else:
                status_info.append("✅ **CI Status**: All recent workflows passing")
    except:
        pass  # Workflow status is optional

    return (
        "\n".join(f"- {info}" for info in status_info)
        if status_info
        else "- *No status information available*"
    )


def generate_agenda(issues: dict[str, list[dict[str, Any]]], date: str) -> str:
    """Generate complete meeting agenda."""
    agenda_lines = [
        f"# IntelGraph Council Agenda — {date}",
        "",
        f"**Meeting Date**: {date}",
        f"**Generated**: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')} (automated)",
        "",
        "## Project Status Overview",
        "",
        get_sprint_status(),
        "",
        "---",
        "",
    ]

    # Add each issue category
    agenda_lines.append(
        format_issue_section("🎯 Decisions Requiring Input", issues.get("decisions", []))
    )
    agenda_lines.append(
        format_issue_section("🚨 High Priority Issues", issues.get("high_priority", []))
    )
    agenda_lines.append(
        format_issue_section("🔄 Change Requests", issues.get("change_requests", []))
    )
    agenda_lines.append(format_issue_section("⚠️  Current Risks", issues.get("risks", [])))
    agenda_lines.append(
        format_issue_section("🚧 Blockers & Dependencies", issues.get("blockers", []))
    )

    # Add meeting logistics
    agenda_lines.extend(
        [
            "---",
            "",
            "## Meeting Notes",
            "",
            "### Attendees",
            "- [ ] Project Sponsor",
            "- [ ] Product Owner",
            "- [ ] Engineering Lead",
            "- [ ] Other: ________________",
            "",
            "### Key Decisions Made",
            "1. *Decision 1*: Description and rationale",
            "2. *Decision 2*: Description and rationale",
            "",
            "### Action Items",
            "| Action | Owner | Due Date | Status |",
            "|--------|-------|----------|--------|",
            "| | | | |",
            "",
            "### Next Meeting",
            "**Date**: _________________",
            "**Focus**: _________________",
            "",
            "---",
            "",
            "*This agenda was automatically generated from GitHub issues and project status.*",
            "*For questions or agenda modifications, contact the project manager.*",
        ]
    )

    return "\n".join(agenda_lines)


def main():
    parser = argparse.ArgumentParser(description="Generate PMI council meeting agenda")
    parser.add_argument(
        "--date",
        "-d",
        type=str,
        default=datetime.date.today().isoformat(),
        help="Meeting date (YYYY-MM-DD, default: today)",
    )
    parser.add_argument(
        "--output-dir",
        "-o",
        type=str,
        default="pm/agendas",
        help="Output directory (default: pm/agendas)",
    )
    parser.add_argument(
        "--filename", "-f", type=str, help="Custom filename (default: auto-generated from date)"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Print agenda to console instead of saving to file"
    )

    args = parser.parse_args()

    # Validate date format
    try:
        meeting_date = datetime.datetime.strptime(args.date, "%Y-%m-%d").date()
        formatted_date = meeting_date.strftime("%Y-%m-%d")
    except ValueError:
        print(f"Error: Invalid date format '{args.date}'. Use YYYY-MM-DD.")
        return 1

    # Fetch project issues
    issues = fetch_project_issues()

    # Generate agenda
    agenda_content = generate_agenda(issues, formatted_date)

    if args.dry_run:
        print(agenda_content)
        return 0

    # Determine output file
    output_dir = pathlib.Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    filename = args.filename or f"{formatted_date}.md"
    output_path = output_dir / filename

    # Write agenda file
    try:
        output_path.write_text(agenda_content)
        print(f"✅ Agenda generated: {output_path}")

        # Print summary
        total_items = sum(len(items) for items in issues.values())
        print(
            f"   📋 {total_items} items across {len([k for k, v in issues.items() if v])} categories"
        )

        if any(issues.values()):
            print("   📊 Item breakdown:")
            for category, items in issues.items():
                if items:
                    print(f"      - {category.replace('_', ' ').title()}: {len(items)} items")
        else:
            print("   ℹ️  Note: No GitHub issues found - check labels or repository access")

    except Exception as e:
        print(f"❌ Error writing agenda to {output_path}: {e}")
        return 1

    return 0


if __name__ == "__main__":
    exit(main())
