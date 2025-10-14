resource "aws_ecr_repository" "app" {
  name = "intelgraph/app"
  image_scanning_configuration { scan_on_push = true }
}

resource "aws_ecr_repository" "web" {
  name = "intelgraph/web"
  image_scanning_configuration { scan_on_push = true }
}

