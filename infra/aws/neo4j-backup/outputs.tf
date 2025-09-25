output "neo4j_backup_bucket_name" {
  description = "Name of the S3 bucket for Neo4j backups."
  value       = aws_s3_bucket.neo4j_backup_bucket.bucket
}

output "neo4j_backup_role_arn" {
  description = "ARN of the IAM role for Neo4j to access S3 backup bucket."
  value       = aws_iam_role.neo4j_backup_role.arn
}
