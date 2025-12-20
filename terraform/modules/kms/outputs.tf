output "key_arn" {
  value = aws_kms_key.this.arn
}

output "key_id" {
  value = aws_kms_key.this.key_id
}

output "alias_arns" {
  value = [for alias in aws_kms_alias.this : alias.arn]
}
