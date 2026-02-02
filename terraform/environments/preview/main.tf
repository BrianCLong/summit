module "oidc_trust" {
  source = "../../modules/gh_oidc"

  role_name        = "summit-preview-deployer"
  github_sub_claim = "repo:BrianCLong/summit:ref:refs/heads/release/*"
}

output "deployer_role_arn" {
  value = module.oidc_trust.role_arn
}
