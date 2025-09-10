resource "aws_glue_crawler" "example" {
  database_name = "my_database"
  name          = "my-crawler"
  role          = "arn:aws:iam::123456789012:role/service-role/AWSGlueServiceRole"
  s3_target {
    path = "s3://my-bucket/my-prefix/"
  }
}