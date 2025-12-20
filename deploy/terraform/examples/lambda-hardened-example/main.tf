provider "aws" {
  region = "us-east-1"
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/src/index.js"
  output_path = "${path.module}/lambda.zip"
}

module "hardened_lambda" {
  source = "../../modules/lambda-hardened"

  function_name = "example-hardened-lambda"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  memory_size   = 256
  timeout       = 10

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment_variables = {
    NODE_ENV = "production"
    LOG_LEVEL = "info"
  }

  tags = {
    Environment = "Example"
    Project     = "IntelGraph"
    ManagedBy   = "Terraform"
  }
}

output "lambda_function_arn" {
  value = module.hardened_lambda.lambda_arn
}

output "lambda_dlq_url" {
  value = module.hardened_lambda.dlq_url
}
