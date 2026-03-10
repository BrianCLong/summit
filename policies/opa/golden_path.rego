package golden_path

import rego.v1


# Default to allow (warn only)
default allow = true

# Warn if deploying from main but checks failed
warn contains msg if {
    input.branch == "main"
    not checks_passing
    msg := "Golden Path checks must pass for main branch deployments"
}

checks_passing if {
    input.checks["Golden Path Supply Chain"] == "success"
}
