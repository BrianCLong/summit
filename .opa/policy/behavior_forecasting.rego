package behavior_forecasting

default allow = false

allow {
  input.policy_violation_probability < 0.10
  input.calibration_error <= 0.05
  input.fixture_integrity == true
}

deny[msg] {
  input.policy_violation_probability >= 0.10
  msg := "Policy violation probability exceeds 0.10 threshold"
}

deny[msg] {
  input.calibration_error > 0.05
  msg := "Calibration error exceeds 0.05 threshold"
}

deny[msg] {
  input.fixture_integrity != true
  msg := "Fixture integrity check failed"
}
