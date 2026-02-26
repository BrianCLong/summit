package budget

import future.keywords

deny[msg] {
  input.cost > input.budget
  msg := "Budget exceeded"
}
