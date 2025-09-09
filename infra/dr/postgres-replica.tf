module "pg_replica" {
  source = "./modules/pg-replica"
  primary_region = "us-east-1"
  dr_region      = "us-west-2"
}