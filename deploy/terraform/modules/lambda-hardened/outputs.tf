output "lambda_arn" {
  value = aws_lambda_function.this.arn
}

output "lambda_function_name" {
  value = aws_lambda_function.this.function_name
}

output "role_arn" {
  value = aws_iam_role.lambda_role.arn
}

output "role_name" {
  value = aws_iam_role.lambda_role.name
}

output "dlq_url" {
  value = aws_sqs_queue.dlq.id
}

output "dlq_arn" {
  value = aws_sqs_queue.dlq.arn
}

output "kms_key_arn" {
  value = aws_kms_key.lambda_key.arn
}

output "app_name" {
  value = aws_codedeploy_app.this.name
}

output "deployment_group_name" {
  value = aws_codedeploy_deployment_group.this.deployment_group_name
}
