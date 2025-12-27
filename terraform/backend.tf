terraform {
  backend "s3" {
    bucket         = "summit-tf-state-acme-prod"
    key            = "global/terraform.tfstate"
    region         = "us-west-2"
    dynamodb_table = "summit-tf-locks"
    encrypt        = true
  }
}
