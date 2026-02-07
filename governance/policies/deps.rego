import future.keywords
package deps.policy

# Demo dependency input format:
# { "deps": [ { "name":"x", "version":"1.2.3", "signed": true } ] }

deny["dependency not pinned (no version)"] {
  some d
  input.deps[d].version == ""
}

deny[msg] {
  some d
  dep := input.deps[d]
  dep.signed != true
  msg := sprintf("unsigned dep: %s", [dep.name])
}
