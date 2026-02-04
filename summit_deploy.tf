
    provider "aws" {}
    module "summit_cluster" {
        source = "./modules/summit"
        instance_count = 3
        enable_hyper_engine = true
    }
