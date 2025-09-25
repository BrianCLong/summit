variable "bucket_name" { type = string, description = "Name of the S3 bucket for Neo4j backups" }
variable "region" { type = string, description = "AWS region" }

resource "aws_s3_bucket" "neo4j_backup_bucket" {
  bucket = var.bucket_name
  acl    = "private"

  versioning {
    enabled = true
  }

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }

  tags = {
    Name = "neo4j-backup-bucket"
    Environment = var.region
  }
}

resource "aws_iam_policy" "neo4j_backup_policy" {
  name        = "neo4j-backup-policy"
  description = "IAM policy for Neo4j to access S3 backup bucket"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:DeleteObject"
        ],
        Effect = "Allow",
        Resource = [
          aws_s3_bucket.neo4j_backup_bucket.arn,
          "${aws_s3_bucket.neo4j_backup_bucket.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role" "neo4j_backup_role" {
  name               = "neo4j-backup-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Sid    = "",
        Principal = {
          Service = "ec2.amazonaws.com" # Assuming Neo4j runs on EC2
        }
      },
    ],
  })
}

resource "aws_iam_role_policy_attachment" "neo4j_backup_attach" {
  role       = aws_iam_role.neo4j_backup_role.name
  policy_arn = aws_iam_policy.neo4j_backup_policy.arn
}

output "neo4j_backup_bucket_name" {
  value = aws_s3_bucket.neo4j_backup_bucket.bucket
}

output "neo4j_backup_role_arn" {
  value = aws_iam_role.neo4j_backup_role.arn
}
