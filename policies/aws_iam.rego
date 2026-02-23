
package maestro.governance

# Deny overly permissive IAM roles
deny[msg] {
    input.asset_type == "aws_iam_role"
    statement := input.attributes.policy.Statement[_]
    statement.Effect == "Allow"
    statement.Action == "*"
    statement.Resource == "*"
    msg := sprintf("IAM Role '%s' has a policy with Allow '*:*', which is forbidden.", [input.name])
}
