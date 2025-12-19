output "key_arn" {
  description = "ARN of the managed KMS key."
  value       = aws_kms_key.this.arn
}

output "key_id" {
  description = "ID of the managed KMS key."
  value       = aws_kms_key.this.id
}

output "alias_arn" {
  description = "ARN of the created key alias."
  value       = aws_kms_alias.this.arn
}
