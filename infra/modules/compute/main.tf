# Compute Module
resource "aws_eks_cluster" "main" {
  name     = "${var.environment}-cluster"
  role_arn = var.cluster_role_arn

  vpc_config {
    subnet_ids = var.subnet_ids
  }
}

resource "aws_eks_addon" "ebs_csi" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "aws-ebs-csi-driver"
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.environment}-node-group"
  node_role_arn   = var.node_role_arn
  subnet_ids      = var.subnet_ids

  scaling_config {
    desired_size = 2
    max_size     = 3
    min_size     = 1
  }

  instance_types = ["t3.medium"]
}

variable "environment" {
  type        = string
  description = "The environment name"
}

variable "cluster_role_arn" {
  type        = string
  description = "ARN of the EKS cluster role"
}

variable "node_role_arn" {
  type        = string
  description = "ARN of the EKS node group role"
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs"
}
