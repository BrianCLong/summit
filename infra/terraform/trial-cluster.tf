resource "random_id" "suffix" {
  byte_length = 4
}

module "eks_trial" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "summit-trial-${random_id.suffix.hex}"
  cluster_version = "1.27"

  vpc_id     = var.vpc_id
  subnet_ids = var.subnet_ids

  eks_managed_node_groups = {
    trial = {
      min_size     = 2
      max_size     = 2
      desired_size = 2

      instance_types = ["t3.medium"]
      capacity_type  = "SPOT"
    }
  }

  # OPA gates (Gatekeeper)
  cluster_addons = {
    coredns = {
      resolve_conflicts = "OVERWRITE"
    }
    kube-proxy = {}
    vpc-cni = {
      resolve_conflicts = "OVERWRITE"
    }
  }

  tags = {
    Environment = "trial"
    Project     = "Summit"
  }
}

# Neo4j Managed (Placeholder)
resource "helm_release" "neo4j_trial" {
  name       = "neo4j-trial-${random_id.suffix.hex}"
  repository = "https://helm.neo4j.com"
  chart      = "neo4j"
  namespace  = "trial"

  set {
    name  = "neo4j.password"
    value = var.neo4j_password
  }

  set {
    name  = "core.standalone"
    value = "true"
  }
}

# Redis Managed (Placeholder)
resource "helm_release" "redis_trial" {
  name       = "redis-trial-${random_id.suffix.hex}"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "redis"
  namespace  = "trial"

  set {
    name  = "architecture"
    value = "standalone"
  }
}

# Domain mapping
resource "aws_route53_record" "trial_domain" {
  zone_id = var.route53_zone_id
  name    = "trial-${random_id.suffix.hex}.summit.live"
  type    = "A"

  alias {
    name                   = module.eks_trial.cluster_endpoint
    zone_id                = module.eks_trial.cluster_certificate_authority_data # Placeholder for ALB/Ingress
    evaluate_target_health = true
  }
}

output "cluster_name" {
  value = module.eks_trial.cluster_name
}

output "trial_url" {
  value = "https://trial-${random_id.suffix.hex}.summit.live"
}
