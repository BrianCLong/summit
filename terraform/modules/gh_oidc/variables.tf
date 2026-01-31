variable "role_name" {
  description = "Name of the IAM role to create"
  type        = string
}

variable "github_thumbprint_list" {
  description = "List of thumbprints for the OIDC provider"
  type        = list(string)
  default     = ["6938fd4d98bab03faadb97b34396831e3780aea1"] # GitHub Actions thumbprint
}

variable "github_sub_claim" {
  description = "The subject claim to match (e.g., repo:org/repo:ref:refs/heads/release/*)"
  type        = string
}
