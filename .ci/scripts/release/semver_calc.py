#!/usr/bin/env python3
"""
Semantic Version Calculator for Release Train

Analyzes git commit history using Conventional Commits format to determine
the next semantic version.

Usage:
    python semver_calc.py --last-tag v1.0.0 --output github
    python semver_calc.py --last-tag v1.0.0 --force-version 2.0.0 --output json

Conventional Commits Rules:
    - feat: minor version bump
    - fix: patch version bump
    - BREAKING CHANGE: major version bump
    - Any commit with ! after type: major version bump (e.g., feat!:)
"""

import argparse
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class BumpType(Enum):
    MAJOR = "major"
    MINOR = "minor"
    PATCH = "patch"


@dataclass
class Version:
    major: int
    minor: int
    patch: int
    prerelease: str | None = None

    @classmethod
    def parse(cls, version_str: str) -> "Version":
        """Parse a version string like v1.2.3 or 1.2.3-rc.1"""
        version_str = version_str.lstrip("v")

        prerelease = None
        if "-" in version_str:
            version_str, prerelease = version_str.split("-", 1)

        parts = version_str.split(".")
        if len(parts) != 3:
            raise ValueError(f"Invalid version format: {version_str}")

        return cls(
            major=int(parts[0]),
            minor=int(parts[1]),
            patch=int(parts[2]),
            prerelease=prerelease,
        )

    def bump(self, bump_type: BumpType) -> "Version":
        """Return a new version with the specified bump applied."""
        if bump_type == BumpType.MAJOR:
            return Version(self.major + 1, 0, 0)
        elif bump_type == BumpType.MINOR:
            return Version(self.major, self.minor + 1, 0)
        else:
            return Version(self.major, self.minor, self.patch + 1)

    def with_rc(self, rc_number: int) -> "Version":
        """Return a new version with release candidate suffix."""
        return Version(
            self.major,
            self.minor,
            self.patch,
            f"rc.{rc_number}",
        )

    def __str__(self) -> str:
        base = f"{self.major}.{self.minor}.{self.patch}"
        if self.prerelease:
            return f"{base}-{self.prerelease}"
        return base


@dataclass
class Commit:
    sha: str
    message: str
    body: str
    type: str | None = None
    scope: str | None = None
    breaking: bool = False

    def __post_init__(self):
        self._parse_conventional()

    def _parse_conventional(self):
        """Parse conventional commit format."""
        # Match pattern: type(scope)!: description or type!: description
        pattern = r"^(\w+)(?:\(([^)]+)\))?(!)?\s*:\s*(.+)$"
        match = re.match(pattern, self.message, re.IGNORECASE)

        if match:
            self.type = match.group(1).lower()
            self.scope = match.group(2)
            self.breaking = match.group(3) == "!"

        # Check body for BREAKING CHANGE footer
        if "BREAKING CHANGE:" in self.body or "BREAKING-CHANGE:" in self.body:
            self.breaking = True


def get_commits_since_tag(tag: str) -> list[Commit]:
    """Get all commits since the specified tag."""
    try:
        # Get commit SHAs since tag
        result = subprocess.run(
            ["git", "log", f"{tag}..HEAD", "--format=%H"],
            capture_output=True,
            text=True,
            check=True,
        )

        commits = []
        for sha in result.stdout.strip().split("\n"):
            if not sha:
                continue

            # Get commit message and body
            msg_result = subprocess.run(
                ["git", "log", "-1", "--format=%s%n%n%b", sha],
                capture_output=True,
                text=True,
                check=True,
            )

            parts = msg_result.stdout.split("\n\n", 1)
            message = parts[0]
            body = parts[1] if len(parts) > 1 else ""

            commits.append(Commit(sha=sha, message=message, body=body))

        return commits
    except subprocess.CalledProcessError as e:
        print(f"Error getting commits: {e}", file=sys.stderr)
        return []


def determine_bump_type(commits: list[Commit]) -> BumpType:
    """Determine the version bump type based on commits."""
    has_breaking = any(c.breaking for c in commits)
    has_feature = any(c.type == "feat" for c in commits)
    has_fix = any(c.type == "fix" for c in commits)

    if has_breaking:
        return BumpType.MAJOR
    elif has_feature:
        return BumpType.MINOR
    elif has_fix:
        return BumpType.PATCH
    else:
        # Default to patch for any other changes
        return BumpType.PATCH


def get_next_rc_number(version: Version) -> int:
    """Determine the next RC number for a version."""
    try:
        result = subprocess.run(
            ["git", "tag", "-l", f"v{version.major}.{version.minor}.{version.patch}-rc.*"],
            capture_output=True,
            text=True,
            check=True,
        )

        existing_rcs = result.stdout.strip().split("\n")
        existing_rcs = [t for t in existing_rcs if t]

        if not existing_rcs:
            return 1

        # Extract RC numbers
        rc_numbers = []
        for tag in existing_rcs:
            match = re.search(r"-rc\.(\d+)$", tag)
            if match:
                rc_numbers.append(int(match.group(1)))

        return max(rc_numbers, default=0) + 1
    except subprocess.CalledProcessError:
        return 1


def generate_changelog(commits: list[Commit]) -> str:
    """Generate a simple changelog from commits."""
    sections = {
        "breaking": [],
        "feat": [],
        "fix": [],
        "perf": [],
        "refactor": [],
        "docs": [],
        "chore": [],
        "other": [],
    }

    for commit in commits:
        short_sha = commit.sha[:7]

        if commit.breaking:
            sections["breaking"].append(f"- {commit.message} ({short_sha})")
        elif commit.type in sections:
            sections[commit.type].append(f"- {commit.message} ({short_sha})")
        else:
            sections["other"].append(f"- {commit.message} ({short_sha})")

    changelog = []

    section_titles = {
        "breaking": "BREAKING CHANGES",
        "feat": "Features",
        "fix": "Bug Fixes",
        "perf": "Performance",
        "refactor": "Refactoring",
        "docs": "Documentation",
        "chore": "Chores",
        "other": "Other Changes",
    }

    for key, title in section_titles.items():
        if sections[key]:
            changelog.append(f"\n### {title}\n")
            changelog.extend(sections[key])

    return "\n".join(changelog)


def output_github(
    version: Version,
    rc_version: Version,
    bump_type: BumpType,
    changelog: str,
):
    """Output results in GitHub Actions format."""
    github_output = os.environ.get("GITHUB_OUTPUT", "")

    if github_output:
        with open(github_output, "a") as f:
            f.write(f"version={version}\n")
            f.write(f"rc_version={rc_version}\n")
            f.write(f"bump_type={bump_type.value}\n")
            # Multiline output for changelog
            f.write(f"changelog<<EOF\n{changelog}\nEOF\n")
    else:
        print(f"version={version}")
        print(f"rc_version={rc_version}")
        print(f"bump_type={bump_type.value}")


def output_json(
    version: Version,
    rc_version: Version,
    bump_type: BumpType,
    changelog: str,
    commits: list[Commit],
):
    """Output results as JSON."""
    result = {
        "version": str(version),
        "rc_version": str(rc_version),
        "bump_type": bump_type.value,
        "changelog": changelog,
        "commit_count": len(commits),
        "breaking_changes": sum(1 for c in commits if c.breaking),
        "features": sum(1 for c in commits if c.type == "feat"),
        "fixes": sum(1 for c in commits if c.type == "fix"),
        "calculated_at": datetime.utcnow().isoformat() + "Z",
    }
    print(json.dumps(result, indent=2))


def main():
    parser = argparse.ArgumentParser(
        description="Calculate semantic version from conventional commits"
    )
    parser.add_argument(
        "--last-tag",
        required=True,
        help="Last release tag (e.g., v1.0.0)",
    )
    parser.add_argument(
        "--force-version",
        help="Force a specific version (overrides calculation)",
    )
    parser.add_argument(
        "--output",
        choices=["github", "json", "simple"],
        default="simple",
        help="Output format",
    )

    args = parser.parse_args()

    # Parse last tag
    try:
        last_version = Version.parse(args.last_tag)
    except ValueError as e:
        print(f"Error parsing last tag: {e}", file=sys.stderr)
        sys.exit(1)

    # Get commits
    commits = get_commits_since_tag(args.last_tag)

    if not commits:
        print("No commits found since last tag", file=sys.stderr)
        # Return current version as next if no changes
        rc_number = get_next_rc_number(last_version)
        new_version = last_version
        rc_version = new_version.with_rc(rc_number)
        bump_type = BumpType.PATCH
        changelog = "No changes"
    else:
        # Calculate version
        if args.force_version:
            new_version = Version.parse(args.force_version)
            bump_type = BumpType.PATCH  # Default for forced versions
        else:
            bump_type = determine_bump_type(commits)
            new_version = last_version.bump(bump_type)

        rc_number = get_next_rc_number(new_version)
        rc_version = new_version.with_rc(rc_number)
        changelog = generate_changelog(commits)

    # Output
    if args.output == "github":
        output_github(new_version, rc_version, bump_type, changelog)
    elif args.output == "json":
        output_json(new_version, rc_version, bump_type, changelog, commits)
    else:
        print(f"Version: {new_version}")
        print(f"RC Version: {rc_version}")
        print(f"Bump Type: {bump_type.value}")
        print(f"Commits: {len(commits)}")


if __name__ == "__main__":
    main()
