data "aws_region" "current" {}

resource "aws_lambda_function" "this" {
  function_name = var.function_name
  role          = aws_iam_role.lambda_role.arn
  handler       = var.handler
  runtime       = var.runtime
  memory_size   = var.memory_size
  timeout       = var.timeout

  filename         = var.filename
  source_code_hash = var.source_code_hash
  s3_bucket        = var.s3_bucket
  s3_key           = var.s3_key
  s3_object_version = var.s3_object_version
  publish           = true

  kms_key_arn = aws_kms_key.lambda_key.arn

  environment {
    variables = var.environment_variables
  }

  dynamic "vpc_config" {
    for_each = length(var.vpc_subnet_ids) > 0 ? [1] : []
    content {
      subnet_ids         = var.vpc_subnet_ids
      security_group_ids = var.vpc_security_group_ids
    }
  }

  tracing_config {
    mode = "Active"
  }

  dead_letter_config {
    target_arn = aws_sqs_queue.dlq.arn
  }

  tags = merge(
    var.tags,
    {
      Name = var.function_name
    }
  )
}

resource "aws_lambda_alias" "live" {
  name             = "live"
  description      = "Live alias for Blue/Green deployment"
  function_name    = aws_lambda_function.this.function_name
  function_version = aws_lambda_function.this.version

  lifecycle {
    ignore_changes = [function_version]
  }
}

resource "aws_cloudwatch_log_group" "lambda_log_group" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.lambda_key.arn
  tags              = var.tags
}

resource "aws_sqs_queue" "dlq" {
  name                      = "${var.function_name}-dlq"
  message_retention_seconds = 1209600 # 14 days
  kms_master_key_id         = aws_kms_key.lambda_key.id
  tags                      = var.tags
}

resource "aws_lambda_function_event_invoke_config" "this" {
  function_name                = aws_lambda_function.this.function_name
  qualifier                    = aws_lambda_alias.live.name
  maximum_event_age_in_seconds = 21600
  maximum_retry_attempts       = 2

  destination_config {
    on_failure {
      destination = aws_sqs_queue.dlq.arn
    }
  }
}

resource "aws_lambda_provisioned_concurrency_config" "this" {
  count                             = var.provisioned_concurrency > 0 ? 1 : 0
  function_name                     = aws_lambda_function.this.function_name
  provisioned_concurrent_executions = var.provisioned_concurrency
  qualifier                         = aws_lambda_function.this.version
}
