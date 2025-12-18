# CI Integrity Policy
#
# Validates CI/CD pipeline configurations for security and correctness.

package pve.repo.ci_integrity

import future.keywords.in
import future.keywords.if
import future.keywords.contains

default allow := true

# Required job types
required_jobs := {"lint", "test", "build"}

# Forbidden command patterns
forbidden_patterns := [
    "curl.*\\|.*sh",
    "wget.*\\|.*sh",
    "eval\\s+\\$",
    "npm\\s+publish.*--force",
    "git\\s+push.*--force"
]

# Check for required job types
deny contains msg if {
    job_names := {lower(name) | some name in object.keys(input.jobs)}
    some required in required_jobs
    not job_contains_type(job_names, required)
    msg := sprintf("Missing required job type: '%s'", [required])
}

# Check for overly permissive permissions
deny contains msg if {
    input.permissions == "write-all"
    msg := "Workflow has 'write-all' permissions which is overly permissive"
}

# Check for forbidden commands in steps
deny contains msg if {
    some job_name, job in input.jobs
    some step in job.steps
    step.run != null
    some pattern in forbidden_patterns
    regex.match(pattern, step.run)
    msg := sprintf("Forbidden command pattern in job '%s': %s", [job_name, pattern])
}

# Warn about unpinned actions
warnings contains msg if {
    some job_name, job in input.jobs
    some step in job.steps
    step.uses != null
    not action_is_pinned(step.uses)
    msg := sprintf("Unpinned action in job '%s': %s", [job_name, step.uses])
}

# Warn about missing environment protection for deploy jobs
warnings contains msg if {
    some job_name, job in input.jobs
    contains(lower(job_name), "deploy")
    not job.environment
    msg := sprintf("Deployment job '%s' has no environment protection", [job_name])
}

# Check for production environment protection
warnings contains msg if {
    some job_name, job in input.jobs
    contains(lower(job_name), "prod")
    not has_approval_requirement(job)
    msg := sprintf("Production job '%s' may lack approval requirements", [job_name])
}

# Helper: check if job names contain a type
job_contains_type(names, type) if {
    some name in names
    contains(name, type)
}

# Helper: check if action is pinned to SHA
action_is_pinned(uses) if {
    parts := split(uses, "@")
    count(parts) == 2
    sha := parts[1]
    regex.match(`^[a-f0-9]{40}$`, sha)
}

# Helper: check for approval requirement
has_approval_requirement(job) if {
    job.environment.name != null
}

has_approval_requirement(job) if {
    is_string(job.environment)
}

allow if {
    count(deny) == 0
}

violations := [{"rule": "ci_integrity", "message": msg, "severity": "error"} | some msg in deny]
warnings_list := [{"rule": "ci_integrity", "message": msg, "severity": "warning"} | some msg in warnings]
