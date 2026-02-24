import future.keywords
package policy.iam

deny[msg] {
  input.resource.type == "aws_iam_policy"
  some statement
  statement := input.resource.statement[_]
  statement.effect == "Allow"
  statement.action[_] == "*"
  msg := sprintf("Deny wildcard IAM actions on %s", [input.resource.name])
}

deny[msg] {
  input.resource.type == "aws_iam_policy"
  some statement
  statement := input.resource.statement[_]
  statement.effect == "Allow"
  statement.resource[_] == "*"
  msg := sprintf("Deny wildcard resources on %s", [input.resource.name])
}

deny[msg] {
  input.resource.public == true
  msg := sprintf("Resource %s cannot be public", [input.resource.name])
}

deny[msg] {
  input.resource.type == "aws_iam_policy"
  not input.resource.tags.env
  msg := sprintf("IAM policy %s missing required tag env", [input.resource.name])
}
