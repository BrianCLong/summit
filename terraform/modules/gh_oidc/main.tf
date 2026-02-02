resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = var.github_thumbprint_list
}

resource "aws_iam_role" "deployer" {
  name = "${var.role_name}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = var.github_sub_claim
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "deployer_policy" {
  role       = aws_iam_role.deployer.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess" # Restricted access for preview parity checks
}
