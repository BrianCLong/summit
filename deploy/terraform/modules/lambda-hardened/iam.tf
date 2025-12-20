resource "aws_iam_role" "lambda_role" {
  name = "${var.function_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# Basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# VPC Access policy (conditional)
resource "aws_iam_role_policy_attachment" "lambda_vpc_access" {
  count      = length(var.vpc_subnet_ids) > 0 ? 1 : 0
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# X-Ray Tracing policy
resource "aws_iam_role_policy_attachment" "lambda_xray" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

# KMS Decrypt policy for function-level encryption
resource "aws_iam_role_policy" "kms_decrypt" {
  name = "${var.function_name}-kms-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.lambda_key.arn
      }
    ]
  })
}

# SQS DLQ Send Message policy
resource "aws_iam_role_policy" "dlq_send" {
  name = "${var.function_name}-dlq-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = aws_sqs_queue.dlq.arn
      }
    ]
  })
}

# Custom policy attachment (for least privilege specific needs)
resource "aws_iam_role_policy" "custom_policy" {
  count = var.custom_iam_policy_json != null ? 1 : 0
  name  = "${var.function_name}-custom-policy"
  role  = aws_iam_role.lambda_role.id
  policy = var.custom_iam_policy_json
}

# Secrets Manager Access Policy
resource "aws_iam_role_policy" "secrets_access" {
  count = length(var.allowed_secret_arns) > 0 ? 1 : 0
  name  = "${var.function_name}-secrets-policy"
  role  = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = var.allowed_secret_arns
      }
    ]
  })
}
