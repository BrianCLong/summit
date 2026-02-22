package summit.tools

default allow = false
default decision = "deny"

# Example static policy dataset is loaded from policies.yml at run time as data.policies

# Tool allowed iff requested scope is a subset of allowed scope and within budgets.
allow {
  t := input.tool.name

  # Ensure policy exists for this tool
  policy := data.policies[t]

  # Convert to sets for subset check
  requested := {r | r := input.tool.scope_all[_]}
  allowed := {a | a := policy.allowed_scope[_]}

  # Check if requested is subset of allowed (requested - allowed must be empty)
  count(requested - allowed) == 0

  input.runtime.duration_ms <= policy.budget_ms
  input.runtime.calls <= policy.max_calls
}
decision := "allow" { allow }
