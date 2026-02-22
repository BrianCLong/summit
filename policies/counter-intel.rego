# Placeholder for Counter-Intelligence Policy
# This file is intended to house the Rego policies that will govern
# the automated aspects of the counter-intelligence framework.

package counter_intelligence
import future.keywords.contains
import future.keywords.if
import future.keywords.in

default allow = false

# Example rule: Allow containment protocol to be activated if attribution
# confidence is 'Probable' or higher.
# allow {
#     input.attribution.confidence == "Probable"
#     input.action == "activate_containment"
# }
