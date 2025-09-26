module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  engine  = "postgres"
  engine_version = "16.3"
  instance_class = "db.t4g.medium"
  allocated_storage = 50
  identifier = "intelgraph-dev-db"
  username   = "intelgraph"
  create_random_password = true
  publicly_accessible = false
}

module "elasticache" {
  source = "terraform-aws-modules/elasticache/aws"
  engine = "redis"
  node_type = "cache.t4g.small"
  num_cache_nodes = 1
}

