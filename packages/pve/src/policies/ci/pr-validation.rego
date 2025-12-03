# PR Validation Policy
#
# Validates pull request structure and content.

package pve.ci.pr_validation

import future.keywords.in
import future.keywords.if
import future.keywords.contains

default allow := true

# Limits
max_files := 50
max_lines_changed := 2000
min_title_length := 10
max_title_length := 100
min_description_length := 20

# Protected branches
protected_branches := {"main", "master", "production", "release"}

# Forbidden file patterns
forbidden_patterns := [
    "\\.env$",
    "\\.env\\.local$",
    "credentials\\.json$",
    "secrets\\.yaml$",
    "\\.pem$",
    "\\.key$",
    "id_rsa"
]

# Secret patterns
secret_patterns := [
    "AKIA[0-9A-Z]{16}",
    "-----BEGIN.*PRIVATE KEY-----",
    "ghp_[a-zA-Z0-9]{36}",
    "password\\s*[:=]\\s*[\"'][^\"']+[\"']"
]

# Check file count
deny contains msg if {
    count(input.files) > max_files
    msg := sprintf("PR contains %d files, exceeding maximum of %d", [count(input.files), max_files])
}

# Check total lines changed
deny contains msg if {
    total := sum([f.additions + f.deletions | some f in input.files])
    total > max_lines_changed
    msg := sprintf("PR changes %d lines, exceeding maximum of %d", [total, max_lines_changed])
}

# Check for forbidden file patterns
deny contains msg if {
    some file in input.files
    some pattern in forbidden_patterns
    regex.match(pattern, file.path)
    msg := sprintf("PR contains forbidden file: %s", [file.path])
}

# Check for secrets in patches
deny contains msg if {
    some file in input.files
    file.patch != null
    some pattern in secret_patterns
    regex.match(pattern, file.patch)
    msg := sprintf("Potential secret detected in %s", [file.path])
}

# Check protected branch targeting
warnings contains msg if {
    input.base in protected_branches
    msg := sprintf("PR targets protected branch: %s", [input.base])
}

# Check title length
warnings contains msg if {
    input.pr.title != null
    count(input.pr.title) < min_title_length
    msg := sprintf("PR title is too short (%d chars, minimum %d)", [count(input.pr.title), min_title_length])
}

warnings contains msg if {
    input.pr.title != null
    count(input.pr.title) > max_title_length
    msg := sprintf("PR title is too long (%d chars, maximum %d)", [count(input.pr.title), max_title_length])
}

# Check description
warnings contains msg if {
    not input.pr.body
    msg := "PR has no description"
}

warnings contains msg if {
    input.pr.body != null
    count(input.pr.body) < min_description_length
    msg := sprintf("PR description is too short (%d chars)", [count(input.pr.body)])
}

# Check for work-in-progress
warnings contains msg if {
    input.pr.isDraft == false
    "work-in-progress" in input.pr.labels
    msg := "PR is marked as work-in-progress but not a draft"
}

allow if {
    count(deny) == 0
}

violations := [{"rule": "pr_validation", "message": msg, "severity": "error"} | some msg in deny]
warnings_list := [{"rule": "pr_validation", "message": msg, "severity": "warning"} | some msg in warnings]
