output "bucket_id" {
  description = "ID of the configuration bucket."
  value       = aws_s3_bucket.this.id
}

output "bucket_arn" {
  description = "ARN of the configuration bucket."
  value       = aws_s3_bucket.this.arn
}
