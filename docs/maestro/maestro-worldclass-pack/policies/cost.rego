import future.keywords
package maestro.cost

violation[reason] {
  input.estimated_cost > input.step_budget
  reason := sprintf("Step cost %.4f exceeds budget %.4f", [input.estimated_cost, input.step_budget])
}
