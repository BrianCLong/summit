import future.keywords
package gpu.policy
# Example policy: Deny GPU usage for non-ML workloads
deny contains msg if {
  input.workload.type != "ml"
  input.workload.gpu_requested == true
  msg := "GPU usage restricted to ML workloads"
}
