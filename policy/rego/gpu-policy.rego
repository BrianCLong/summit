package gpu.policy

import future.keywords.contains
import future.keywords.if
# Example policy: Deny GPU usage for non-ML workloads
deny contains msg if {
  input.workload.type != "ml"
  input.workload.gpu_requested == true
  msg := "GPU usage restricted to ML workloads"
}
