package truth_defense

import future.keywords

deny[msg] {
  input.integrity_score < 0.5
  msg := "Low integrity score detected"
}
