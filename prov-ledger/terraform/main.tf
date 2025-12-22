resource "aws_ecr_repository" "this" {
  name = var.repository_name
}

resource "helm_release" "prov_ledger" {
  name       = "prov-ledger"
  repository = var.chart_repository
  chart      = "prov-ledger"
  version    = var.chart_version
  namespace  = var.namespace

  set {
    name  = "image.repository"
    value = aws_ecr_repository.this.repository_url
  }
}
