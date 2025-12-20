variable "organization" {
  description = "GitHub organization"
  type        = string
}

variable "repository" {
  description = "Repository name"
  type        = string
}

variable "github_token" {
  description = "Token for GitHub provider"
  type        = string
  sensitive   = true
}

variable "release_captains_team" {
  description = "Team slug allowed to push to release branches"
  type        = string
}
