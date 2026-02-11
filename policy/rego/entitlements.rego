import future.keywords.in
import future.keywords.if
package entitlements

# input: { plan, feature }
allow if {
  input.feature == "batch_import"; input.plan == "enterprise"
} else if {
  input.feature == "advanced_export"; input.plan != "starter"
} else if {
  input.feature == "basic"; true
}
