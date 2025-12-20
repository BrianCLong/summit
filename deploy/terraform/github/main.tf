terraform {
  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}

provider "github" {
  owner = var.organization
  token = var.github_token
}

module "rulesets" {
  source = "./modules/rulesets"

  organization          = var.organization
  repository            = var.repository
  release_captains_team = var.release_captains_team
  required_status_checks = [
    "build",
    "unit",
    "e2e",
    "security-scan",
    "sbom",
    "infra-plan",
    "slo-gates",
    "migration-gate"
  ]
}
