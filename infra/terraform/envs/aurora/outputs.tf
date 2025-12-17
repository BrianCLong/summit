
output "cluster_endpoint" { value = aws_rds_cluster.pg.endpoint }
output "reader_endpoint"  { value = aws_rds_cluster.pg.reader_endpoint }
output "cluster_arn"      { value = aws_rds_cluster.pg.arn }
output "cluster_id"       { value = aws_rds_cluster.pg.id }
output "kms_key_arn"      { value = aws_kms_key.pg.arn }
