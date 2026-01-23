# Claude Code CLI Example Policy
# This policy demonstrates a safe-by-default configuration for CI environments.

package claude.policy

import future.keywords.if
import future.keywords.in
import future.keywords.contains

# Default deny - fail closed
default decision := {
    "allow": false,
    "deny_reasons": ["default_deny"],
    "limits": {}
}

# Configuration limits
max_files := 20
max_diff_bytes := 2000000  # 2MB

# Denied file patterns (always blocked)
denied_patterns := [
    ".git/**",
    "**/*.pem",
    "**/*.key",
    "**/*.p12",
    "**/*.pfx",
    "**/id_rsa*",
    "**/*_ed25519*",
    "**/secrets/**",
    "**/.env",
    "**/.env.*"
]

# Check if a file matches any denied pattern
file_matches_denied_pattern(file) if {
    some pattern in denied_patterns
    glob.match(pattern, ["/"], file)
}

# Collect all files from write_patch actions
write_patch_files[file] {
    some action in input.actions
    action.type == "write_patch"
    some file in action.files
}

# Calculate total diff bytes from write_patch actions
total_diff_bytes := sum([action.diff_bytes |
    some action in input.actions
    action.type == "write_patch"
])

# Check for denied files
denied_files[file] {
    some file in write_patch_files
    file_matches_denied_pattern(file)
}

# Build deny reasons
deny_reasons := reasons {
    reasons := array.concat(
        array.concat(
            array.concat(
                too_many_files_reasons,
                diff_too_large_reasons
            ),
            denied_file_reasons
        ),
        ci_no_policy_reasons
    )
}

# Reason: too many files
too_many_files_reasons := ["too_many_files"] if {
    count(write_patch_files) > max_files
} else := []

# Reason: diff too large
diff_too_large_reasons := ["diff_too_large"] if {
    total_diff_bytes > max_diff_bytes
} else := []

# Reason: denied files
denied_file_reasons := [reason |
    some file in denied_files
    reason := concat("", ["denied_file:", file])
]

# Reason: CI mode without policy
ci_no_policy_reasons := ["ci_mode_requires_policy"] if {
    input.flags.ci == true
    input.flags.policy_present == false
} else := []

# Allow conditions:
# 1. No write_patch actions, OR
# 2. write_patch actions within limits and no denied files
allow_conditions {
    # No write_patch actions
    count(write_patch_files) == 0
}

allow_conditions {
    # Write_patch within limits
    count(write_patch_files) <= max_files
    total_diff_bytes <= max_diff_bytes
    count(denied_files) == 0
}

# Final decision
decision := {
    "allow": true,
    "deny_reasons": [],
    "limits": {
        "max_files": max_files,
        "max_diff_bytes": max_diff_bytes
    }
} if {
    allow_conditions
    count(deny_reasons) == 0
}

decision := {
    "allow": false,
    "deny_reasons": deny_reasons,
    "limits": {
        "max_files": max_files,
        "max_diff_bytes": max_diff_bytes
    }
} if {
    count(deny_reasons) > 0
}
