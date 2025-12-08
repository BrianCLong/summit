terraform {
  backend "s3" {
    bucket         = "tfstate-platform-shared"
    key            = "intelgraph/free-tier/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "tf-locks"
    encrypt        = true
  }
}