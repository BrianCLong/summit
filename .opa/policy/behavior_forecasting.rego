package behavior_forecasting

default allow = false

allow {
    input.policy_violation_probability < 0.10
    input.calibration_error <= 0.05
    input.fixture_integrity == true
}
