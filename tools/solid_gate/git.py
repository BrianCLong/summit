import subprocess
from typing import List, Tuple


def get_changed_files(base_ref: str, head_ref: str = "HEAD") -> list[str]:
    """Returns a list of changed files between base_ref and head_ref."""
    try:
        cmd = ["git", "diff", "--name-only", f"{base_ref}...{head_ref}"]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return [f for f in result.stdout.splitlines() if f.strip()]
    except subprocess.CalledProcessError:
        # Fallback if ... syntax fails (e.g. shallow clone issue), try ..
        cmd = ["git", "diff", "--name-only", f"{base_ref}..{head_ref}"]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return [f for f in result.stdout.splitlines() if f.strip()]

def get_file_content(filepath: str) -> str:
    """Reads file content from disk."""
    try:
        with open(filepath, encoding='utf-8') as f:
            return f.read()
    except (OSError, UnicodeDecodeError):
        return ""

def get_diff_content(base_ref: str, filepath: str) -> str:
    """Returns the diff content for a specific file."""
    cmd = ["git", "diff", base_ref, "--", filepath]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return result.stdout
    except subprocess.CalledProcessError:
        return ""

def get_current_commit_sha() -> str:
    cmd = ["git", "rev-parse", "HEAD"]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError:
        return "unknown"
