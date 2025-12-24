resource "aws_db_instance" "intelgraph_replica" {
  identifier                  = "intelgraph-replica-1"
  replicate_source_db         = aws_db_instance.intelgraph_primary.id
  instance_class              = "db.r6g.large"
  publicly_accessible         = false
  auto_minor_version_upgrade  = true
  performance_insights_enabled = true
  monitoring_interval         = 60
}
