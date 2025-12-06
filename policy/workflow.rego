package summit.workflow

import future.keywords.in

# Default: No violations
default allow = true
default deny = set()

# Deny direct pushes to main
deny["Direct pushes to main are prohibited. Use a Pull Request."] {
    input.event_name == "push"
    input.ref == "refs/heads/main"
    # Allow if it's a tag or specific automation user if needed
    not is_automation_user
}

# Warn/Deny on sensitive file changes without governance approval
deny[msg] {
    input.event_name == "pull_request"
    some file in input.changed_files
    is_sensitive_file(file)
    not has_governance_label
    msg := sprintf("Sensitive file modified: %s. Requires 'governance-approved' label.", [file])
}

# Deny invalid PR titles
deny[msg] {
    input.event_name == "pull_request"
    not is_valid_pr_title(input.pr.title)
    msg := sprintf("Invalid PR title: '%s'. Must follow format: type(scope): description. Types: feat, fix, chore, docs, style, refactor, perf, test, build, ci, revert, sec.", [input.pr.title])
}

# Helper: Check if file is sensitive
is_sensitive_file(path) {
    startswith(path, ".github/workflows/")
}
is_sensitive_file(path) {
    startswith(path, "policy/")
}
is_sensitive_file(path) {
    path == "CODEOWNERS"
}

# Helper: Check for governance label
has_governance_label {
    some label in input.pr.labels
    label.name == "governance-approved"
}

# Helper: Check for automation user
is_automation_user {
    input.actor == "dependabot[bot]"
}
is_automation_user {
    input.actor == "github-actions[bot]"
}

# Helper: Check PR title format
is_valid_pr_title(title) {
    # Regex for Conventional Commits
    # ^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test|sec)(\([a-z0-9-]+\))?: .+$
    regex.match(`^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test|sec)(\([a-z0-9-]+\))?: .+$`, title)
}
