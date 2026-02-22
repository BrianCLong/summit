package drift
import future.keywords.if
import future.keywords.in
import future.keywords.contains



default allow := false
default score := 0

score := input.risk

deny contains msg if {
	some ws in split(opa.runtime().env.PROD_LIKE, ",")
	input.workspace == ws
	input.risk > 0
	msg := sprintf("Drift risk %d detected in %s", [input.risk, input.workspace])
}

allow if {
	count(deny) == 0
}
