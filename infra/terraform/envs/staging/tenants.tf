module "tenant" {
  for_each   = toset(var.tenants)
  source     = "../../modules/tenant"
  tenant     = each.key
  vpc_id     = var.vpc_id
  subnet_ids = var.subnet_ids
}
