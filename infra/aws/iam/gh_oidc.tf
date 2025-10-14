data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

resource "aws_iam_role" "github_deployer" {
  name               = "intelgraph-gh-deployer"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = { Federated = data.aws_iam_openid_connect_provider.github.arn },
      Action = "sts:AssumeRoleWithWebIdentity",
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        },
        StringLike = {
          "token.actions.githubusercontent.com:sub" = [
            "repo:BrianCLong/summit:ref:refs/heads/main",
            "repo:BrianCLong/summit:pull_request",
            "repo:BrianCLong/summit:ref:refs/heads/feature/dev-aws-green"
          ]
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "deployer_policy" {
  role = aws_iam_role.github_deployer.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      { Effect = "Allow", Action = [
          "ecr:*", "eks:DescribeCluster", "sts:GetCallerIdentity",
          "iam:PassRole", "autoscaling:*", "ec2:*", "elasticloadbalancing:*"
        ], Resource = "*" }
    ]
  })
}

