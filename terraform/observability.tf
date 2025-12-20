module "observability_dashboards" {
  source     = "./modules/observability"
  dashboards = var.dashboards
}
