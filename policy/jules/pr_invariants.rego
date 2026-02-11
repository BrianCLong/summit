import future.keywords.in
package summit.jules.pr

import future.keywords.if
import future.keywords.contains

default allow := false

# Allow if provenance is present and valid
allow if {
    input.provenance
    input.provenance.generator == "Jules"
    input.provenance.verification == "passed"
}

# Deny if verification failed
deny contains msg if {
    input.provenance.verification == "failed"
    msg := "Provenance verification failed"
}
