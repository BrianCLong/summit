terraform {
  required_version = ">= 1.5.0"
  required_providers { aws = { source = "hashicorp/aws", version = "~> 5.0" } }
}
provider "aws" { region = var.region }
variable "region" { type = string, default = "us-west-2" }
variable "namespace" { type = string, default = "external-dns" }
variable "service_account" { type = string, default = "external-dns" }
variable "hosted_zone_ids" { type = list(string), default = [] }
variable "eks_oidc_url" { type = string }
variable "eks_oidc_thumbprint" { type = string }
resource "aws_iam_openid_connect_provider" "eks" { url = var.eks_oidc_url client_id_list = ["sts.amazonaws.com"] thumbprint_list = [var.eks_oidc_thumbprint] }
data "aws_iam_policy_document" "externaldns_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals { type = "Federated" identifiers = [aws_iam_openid_connect_provider.eks.arn] }
    condition { test = "StringEquals" variable = "${replace(var.eks_oidc_url, "https://", "")}:sub" values = ["system:serviceaccount:${var.namespace}:${var.service_account}"] }
  }
}
resource "aws_iam_role" "externaldns" { name = "companyos-externaldns-irsa" assume_role_policy = data.aws_iam_policy_document.externaldns_trust.json }
data "aws_iam_policy_document" "externaldns" {
  statement { effect = "Allow" actions = ["route53:ListHostedZones","route53:ListHostedZonesByName","route53:ListResourceRecordSets"] resources = ["*"] }
  statement { effect = "Allow" actions = ["route53:ChangeResourceRecordSets"] resources = length(var.hosted_zone_ids) == 0 ? ["*" ] : [ for id in var.hosted_zone_ids : "arn:aws:route53:::hostedzone/${id}" ] }
}
resource "aws_iam_policy" "externaldns" { name = "companyos-externaldns-policy" policy = data.aws_iam_policy_document.externaldns.json }
resource "aws_iam_role_policy_attachment" "attach" { role = aws_iam_role.externaldns.name policy_arn = aws_iam_policy.externaldns.arn }
output "externaldns_role_arn" { value = aws_iam_role.externaldns.arn }
