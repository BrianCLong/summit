variable "tenant" {
  type = string
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"
  cluster_name = "${var.tenant}-eks"
  vpc_id       = var.vpc_id
  subnet_ids   = var.subnet_ids
}

resource "kubernetes_namespace" "tenant" {
  metadata {
    name = var.tenant
    labels = {
      name = var.tenant
    }
  }
}
