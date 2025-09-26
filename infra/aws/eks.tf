module "eks" {
  source          = "terraform-aws-modules/eks/aws"
  cluster_name    = "intelgraph-dev"
  cluster_version = "1.30"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets
  manage_aws_auth_configmap = true
  eks_managed_node_groups = {
    default = { desired_size = 3, max_size = 4, min_size = 3, instance_types = ["m6i.large"] }
  }
}

