provider "aws" {
  alias  = "dev"
  region = var.region
  assume_role { role_arn = var.dev_role_arn }
}
provider "aws" {
  alias  = "staging"
  region = var.region
  assume_role { role_arn = var.staging_role_arn }
}
provider "aws" {
  alias  = "prod"
  region = var.region
  assume_role { role_arn = var.prod_role_arn }
}
