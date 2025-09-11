variable "region" { type = string }
variable "name_prefix" { type = string, default = "summit" }

# Role ARNs to assume into each account (bootstrap or use SSO)
variable "dev_role_arn" { type = string }
variable "staging_role_arn" { type = string }
variable "prod_role_arn" { type = string }

variable "github_org" { type = string }
variable "github_repo" { type = string }
variable "oidc_audience" { type = string, default = "sts.amazonaws.com" }
