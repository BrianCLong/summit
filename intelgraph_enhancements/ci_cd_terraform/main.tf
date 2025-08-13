
provider "aws" {
  region = "us-west-2"
}

resource "aws_ecs_cluster" "intelgraph" {
  name = "intelgraph-cluster"
}

resource "aws_rds_cluster" "intelgraph_db" {
  engine = "aurora-postgresql"
  cluster_identifier = "intelgraph-db"
  master_username = "admin"
  master_password = "SuperSecurePass123"
}
