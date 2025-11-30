terraform {
  backend "s3" {
    bucket         = "summit-tf-state"
    key            = "global/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "summit-tf-locks"
    encrypt        = true
  }
}
