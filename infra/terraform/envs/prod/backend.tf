terraform {
  backend "s3" {
    bucket = "REPLACE_ME_state_bucket"
    key    = "intelgraph/prod/terraform.tfstate"
    region = "REPLACE_ME_region"
  }
}

