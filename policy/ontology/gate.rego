package ontology.gate

import future.keywords.if
import future.keywords.in

default allow = false

# Allow if the user has the 'ontology_admin' role
allow if {
    "ontology_admin" in input.user.roles
}

# Allow read operations for 'ontology_viewer'
allow if {
    input.method == "GET"
    "ontology_viewer" in input.user.roles
}

# Deny modifications to 'core' namespace without specific approval
deny["Modification of core ontology requires special approval"] if {
    input.method in ["POST", "PUT", "DELETE"]
    input.resource.namespace == "core"
    not input.approval.status == "approved"
}

# Require SBOM for new ontology submissions
deny["Missing SBOM for new ontology"] if {
    input.method == "POST"
    not input.resource.sbom
}
