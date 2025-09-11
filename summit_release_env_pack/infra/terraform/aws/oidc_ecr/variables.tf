variable "region" { type = string }
variable "repo_name" { type = string }
variable "github_org" { type = string }
variable "github_repo" { type = string }
variable "oidc_audience" { type = string, default = "sts.amazonaws.com" }
# Optionally restrict to certain branches/environments
variable "ref_patterns" {
  description = "List of allowed refs for OIDC (e.g., 'refs/heads/main', 'refs/tags/*', 'refs/pull/*')"
  type        = list(string)
  default     = ["refs/heads/main", "refs/pull/*", "refs/tags/*"]
}
