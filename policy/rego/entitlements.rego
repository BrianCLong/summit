package entitlements

# input: { plan, feature }
allow {
  input.feature == "batch_import"; input.plan == "enterprise"
} else {
  input.feature == "advanced_export"; input.plan != "starter"
} else {
  input.feature == "basic"; true
}