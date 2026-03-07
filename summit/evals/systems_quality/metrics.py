import os
import statistics
import subprocess
from typing import List, Optional


def run_git_command(repo_path: str, args: list[str]) -> str:
    """Run a git command in the specified repo path."""
    try:
        result = subprocess.run(
            ["git"] + args,
            cwd=repo_path,
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        # If git fails (e.g., bad revision), log/raise or return empty depending on strategy.
        # For now, print error and return empty string to handle gracefully in caller.
        print(f"Git command failed: {e.stderr}")
        return ""

def calculate_defect_density(repo_path: str, commit_range: str, failing_tests_count: int) -> float:
    """
    Calculate defect density as (failing_tests_count / lines_changed).
    lines_changed = insertions + deletions.
    """
    # git diff --shortstat commit_range
    # Output example: " 3 files changed, 12 insertions(+), 5 deletions(-)"
    try:
        output = run_git_command(repo_path, ["diff", "--shortstat", commit_range])
        if not output:
            return 0.0 # Or handle as 0

        parts = output.split(',')
        insertions = 0
        deletions = 0
        for part in parts:
            if "insertion" in part:
                insertions = int(part.strip().split()[0])
            elif "deletion" in part:
                deletions = int(part.strip().split()[0])

        total_lines = insertions + deletions
        if total_lines == 0:
            return 0.0

        return failing_tests_count / total_lines
    except Exception as e:
        print(f"Error calculating defect density: {e}")
        return 0.0

def calculate_rework_rate(repo_path: str, commit_range: str) -> float:
    """
    Calculate rework rate as ratio of files modified > 1 time to total unique files modified.
    """
    # git log --name-only --pretty=format: commit_range
    try:
        output = run_git_command(repo_path, ["log", "--name-only", "--pretty=format:", commit_range])
        # Filter out empty lines
        files = [f.strip() for f in output.split('\n') if f.strip()]

        if not files:
            return 0.0

        file_counts = {}
        for f in files:
            file_counts[f] = file_counts.get(f, 0) + 1

        reworked_files = sum(1 for count in file_counts.values() if count > 1)
        total_unique_files = len(file_counts)

        if total_unique_files == 0:
            return 0.0

        return reworked_files / total_unique_files
    except Exception as e:
        print(f"Error calculating rework rate: {e}")
        return 0.0

def calculate_variance_score(scores: list[float]) -> float:
    """
    Calculate standard deviation of scores from multiple runs.
    """
    if not scores or len(scores) < 2:
        return 0.0
    try:
        return statistics.stdev(scores)
    except Exception as e:
        print(f"Error calculating variance score: {e}")
        return 0.0
