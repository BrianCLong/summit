package gpu.policy
# Example policy: Deny GPU usage for non-ML workloads
deny[msg] {
  input.workload.type != "ml"
  input.workload.gpu_requested == true
  msg := "GPU usage restricted to ML workloads"
}