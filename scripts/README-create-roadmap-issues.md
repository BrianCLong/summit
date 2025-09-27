Create Roadmap Issues

Quick script to populate GitHub Issues for the roadmap with safety and idempotency.

Prerequisites
- Python 3.8+
- Install: `pip install requests`
- Token: GitHub token with `repo` scope

Environment
```
export GITHUB_TOKEN="your_token_here"
export REPO_OWNER="your_username_or_org"
export REPO_NAME="intelgraph"
# Optional (for GHE): export GITHUB_API_URL="https://github.yourcompany.com/api/v3"
```

Dry Run
```
python scripts/create_roadmap_issues.py --dry-run
```

Create Issues
```
python scripts/create_roadmap_issues.py --label Roadmap --prefix "Roadmap: "
```

Options
- `--label`: add label(s), repeatable
- `--assignee`: assign user(s), repeatable
- `--milestone`: milestone number
- `--prefix`: prefix added to each title
- `--dry-run`: prints planned actions only

Notes
- The script skips issues whose title already exists (open or closed).
- Labels are created if missing (best-effort).

