#!/usr/bin/env python3
"""
Batch add path-ignore filters to GitHub Actions workflows.

This script adds docs-skip paths-ignore to workflows that don't have them,
reducing unnecessary CI runs on documentation-only changes.
"""

import os
import re
from pathlib import Path

# Path patterns to ignore for most workflows
PATHS_IGNORE = """    paths-ignore:
      - 'docs/**'
      - '**.md'
      - 'prompts/**'
      - 'evidence/**'"""

# Workflows that should NOT be optimized (they need to run on all changes)
EXCLUDE_WORKFLOWS = [
    'workflow-validity.yml',  # Must validate all workflow changes
    'workflow-lint.yml',      # Must lint all workflows
    'docs-lint.yml',          # Specifically for docs
    'markdown-lint.yml',      # Specifically for markdown
    'doc-link-check.yml',     # Specifically for docs
    'governance.yml',         # Must run on all changes
    'required-checks.yml',    # Must validate all PRs
]

def should_optimize(filename: str, content: str) -> bool:
    """Check if workflow should be optimized."""
    # Skip if already has paths-ignore
    if 'paths-ignore:' in content:
        return False

    # Skip excluded workflows
    if any(excluded in filename for excluded in EXCLUDE_WORKFLOWS):
        return False

    # Skip if it's a reusable workflow (starts with _)
    if os.path.basename(filename).startswith('_'):
        return False

    # Only optimize if it has pull_request trigger
    if 'pull_request:' not in content:
        return False

    return True

def add_paths_ignore(content: str) -> str:
    """Add paths-ignore to pull_request trigger."""
    # Pattern: Find pull_request trigger and add paths-ignore
    # Handle both:
    #   pull_request:
    #     branches: [ main ]
    # And:
    #   pull_request:

    # Look for pattern: pull_request:\n    branches: [...]
    pattern1 = r'(pull_request:\s*\n\s+branches:\s*\[.*?\])'

    def replacement1(match):
        return match.group(1) + '\n' + PATHS_IGNORE

    # Try first pattern
    new_content = re.sub(pattern1, replacement1, content)
    if new_content != content:
        return new_content

    # If that didn't work, try simpler pattern: pull_request: followed by another trigger
    pattern2 = r'(pull_request:\s*\n)(\s+\w+:)'

    def replacement2(match):
        indent = '  '  # Standard indent
        return match.group(1) + PATHS_IGNORE + '\n' + match.group(2)

    new_content = re.sub(pattern2, replacement2, content)
    if new_content != content:
        return new_content

    # If still no change, just add after pull_request:
    pattern3 = r'(pull_request:)\s*\n(\s*\n|concurrency:)'

    def replacement3(match):
        return match.group(1) + '\n' + PATHS_IGNORE + '\n\n' + match.group(2)

    return re.sub(pattern3, replacement3, content)

def main():
    """Optimize all workflows in .github/workflows/."""
    workflows_dir = Path('.github/workflows')

    if not workflows_dir.exists():
        print("Error: .github/workflows directory not found")
        print("Run this script from repository root")
        return 1

    optimized = []
    skipped = []
    errors = []

    for workflow_file in sorted(workflows_dir.glob('*.yml')):
        try:
            content = workflow_file.read_text()

            if not should_optimize(workflow_file.name, content):
                skipped.append(workflow_file.name)
                continue

            new_content = add_paths_ignore(content)

            if new_content == content:
                skipped.append(f"{workflow_file.name} (no change)")
                continue

            # Write optimized content
            workflow_file.write_text(new_content)
            optimized.append(workflow_file.name)
            print(f"✅ Optimized: {workflow_file.name}")

        except Exception as e:
            errors.append(f"{workflow_file.name}: {e}")
            print(f"❌ Error: {workflow_file.name}: {e}")

    # Summary
    print(f"\n{'='*60}")
    print("Optimization Complete")
    print(f"{'='*60}")
    print(f"✅ Optimized: {len(optimized)} workflows")
    print(f"⏭️  Skipped: {len(skipped)} workflows")
    print(f"❌ Errors: {len(errors)} workflows")

    if optimized:
        print("\nOptimized workflows:")
        for name in optimized[:20]:  # Show first 20
            print(f"  - {name}")
        if len(optimized) > 20:
            print(f"  ... and {len(optimized) - 20} more")

    if errors:
        print("\nErrors:")
        for error in errors:
            print(f"  - {error}")

    print("\nNext steps:")
    print("  1. Review changes: git diff .github/workflows/")
    print("  2. Test a sample workflow: act pull_request")
    print(f"  3. Commit: git commit -am 'feat(ci): batch optimize {len(optimized)} workflows'")

    return 0

if __name__ == '__main__':
    exit(main())
