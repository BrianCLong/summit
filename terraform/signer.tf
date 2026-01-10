module "policy_signer" {
  source          = "./modules/policy_signer"
  image           = "<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/intelgraph/signer:latest"
  bundle_url      = "https://artifacts.intelgraph.dev/policy/maestro-policy-bundle.tgz"
  signer_key_id   = "opa-signer-dev"
  alerts_version  = "v0.3.9"
  dashboards_path = "grafana/dashboards"
  opa_url         = "http://opa.intelgraph-dev.svc.cluster.local:8181"
  notary_url      = "https://notary.intelgraph.dev"
  notary_key_secret = "notary-signer-key"
  graph_endpoint  = "http://neo4j.intelgraph-dev.svc.cluster.local:7474"
  secrets_prefix  = "/intelgraph/dev"
}
