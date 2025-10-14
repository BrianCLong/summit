module "mod" {
  source = "../../modules/vpc"
  region = var.region
}
variable "region" { default = "us-east-1" }
output "out" { value = module.mod.example }
