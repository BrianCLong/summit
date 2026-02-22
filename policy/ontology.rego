import future.keywords

package ontology

default allow = false

# Allow administrators to do anything
allow {
    input.user.roles[_] == "admin"
}

# Allow ontology_editor to propose changes (create drafts)
allow {
    input.user.roles[_] == "ontology_editor"
    input.action == "create_draft"
}

# Only ontology_approver can activate/approve
allow {
    input.user.roles[_] == "ontology_approver"
    input.action == "approve_schema"
}

# Deny if deleting active schema (unless super admin)
deny {
    input.action == "delete_schema"
    input.resource.status == "ACTIVE"
    not input.user.roles[_] == "super_admin"
}

# Breaking change detection (simplified)
# Deny approval if it contains breaking changes without major version bump
deny {
    input.action == "approve_schema"
    input.resource.hasBreakingChanges == true
    not is_major_bump(input.resource.version, input.resource.previousVersion)
}

is_major_bump(new_ver, old_ver) {
    # implementation placeholder
    true
}
