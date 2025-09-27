variable "ingest_bucket_name" {
  description = "Name of the S3 bucket used for connector ingest"
  type        = string
}

variable "ingest_worker_role_arn" {
  description = "IAM role assumed by the ingest workers"
  type        = string
}

data "aws_iam_policy_document" "connectors_ingest" {
  statement {
    sid    = "AllowList"
    effect = "Allow"
    actions = [
      "s3:ListBucket",
    ]
    resources = [
      "arn:aws:s3:::${var.ingest_bucket_name}"
    ]
  }

  statement {
    sid    = "AllowReadObjects"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:GetObjectAttributes",
      "s3:GetObjectVersion",
    ]
    resources = [
      "arn:aws:s3:::${var.ingest_bucket_name}/*"
    ]
  }

  statement {
    sid    = "AllowWriteNormalized"
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:AbortMultipartUpload",
      "s3:ListMultipartUploadParts",
    ]
    resources = [
      "arn:aws:s3:::${var.ingest_bucket_name}/normalized/*",
      "arn:aws:s3:::${var.ingest_bucket_name}/dlq/*",
      "arn:aws:s3:::${var.ingest_bucket_name}/metrics/*",
    ]
  }
}

resource "aws_iam_policy" "connectors_ingest" {
  name        = "connectors-${var.env}-ingest"
  description = "Least privilege policy for S3 CSV ingest workers"
  policy      = data.aws_iam_policy_document.connectors_ingest.json
}

resource "aws_iam_role_policy_attachment" "connectors_ingest" {
  role       = var.ingest_worker_role_arn
  policy_arn = aws_iam_policy.connectors_ingest.arn
}
