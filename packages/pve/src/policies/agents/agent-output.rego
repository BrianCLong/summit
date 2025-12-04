# Agent Output Policy
#
# Validates output from AI agents (Claude, Jules, Codex, etc.).

package pve.agents.agent_output

import future.keywords.in
import future.keywords.if
import future.keywords.contains

default allow := true

# Maximum limits
max_response_length := 100000  # 100KB
max_file_size := 50000         # 50KB
max_files := 20

# Forbidden file paths
forbidden_paths := [
    ".env",
    ".env.local",
    ".env.production",
    "credentials.json",
    "secrets.yaml",
    ".git/",
    "node_modules/"
]

# Secret patterns to detect
secret_patterns := [
    "AKIA[0-9A-Z]{16}",                                    # AWS Key
    "-----BEGIN (RSA |EC )?PRIVATE KEY-----",              # Private Key
    "ghp_[a-zA-Z0-9]{36}",                                 # GitHub Token
    "password\\s*[:=]\\s*[\"'][^\"']+[\"']",               # Hardcoded password
    "api[_-]?key\\s*[:=]\\s*[\"'][a-zA-Z0-9_\\-]{16,}[\"']" # API Key
]

# Check response length
deny contains msg if {
    input.output.response != null
    count(input.output.response) > max_response_length
    msg := sprintf("Response length %d exceeds maximum %d", [count(input.output.response), max_response_length])
}

# Check file count
deny contains msg if {
    input.output.files != null
    count(input.output.files) > max_files
    msg := sprintf("Agent created %d files, exceeding maximum %d", [count(input.output.files), max_files])
}

# Check for forbidden paths
deny contains msg if {
    some file in input.output.files
    some forbidden in forbidden_paths
    startswith(file.path, forbidden)
    msg := sprintf("Agent attempted to modify forbidden path: %s", [file.path])
}

deny contains msg if {
    some file in input.output.files
    some forbidden in forbidden_paths
    contains(file.path, forbidden)
    msg := sprintf("Agent attempted to modify forbidden path: %s", [file.path])
}

# Check file sizes
deny contains msg if {
    some file in input.output.files
    count(file.content) > max_file_size
    msg := sprintf("File '%s' exceeds maximum size %d bytes", [file.path, max_file_size])
}

# Check for secrets in output
deny contains msg if {
    some file in input.output.files
    some pattern in secret_patterns
    regex.match(pattern, file.content)
    msg := sprintf("Potential secret detected in file '%s'", [file.path])
}

deny contains msg if {
    input.output.response != null
    some pattern in secret_patterns
    regex.match(pattern, input.output.response)
    msg := "Potential secret detected in agent response"
}

# Warn about TODO comments
warnings contains msg if {
    some file in input.output.files
    regex.match(`TODO\s*:`, file.content)
    msg := sprintf("File '%s' contains TODO comments", [file.path])
}

# Warn about console.log in production code
warnings contains msg if {
    some file in input.output.files
    endswith(file.path, ".ts")
    not contains(file.path, ".test.")
    not contains(file.path, ".spec.")
    regex.match(`console\.(log|debug|info)`, file.content)
    msg := sprintf("File '%s' contains console.log statements", [file.path])
}

allow if {
    count(deny) == 0
}

violations := [{"rule": "agent_output", "message": msg, "severity": "error"} | some msg in deny]
warnings_list := [{"rule": "agent_output", "message": msg, "severity": "warning"} | some msg in warnings]
