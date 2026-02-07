
package maestro.governance
import future.keywords.if
import future.keywords.in

# Deny overly permissive IAM roles
deny[msg] {
    input.asset_type == "aws_iam_role"
    some statement in input.attributes.policy.Statement
    statement.Effect == "Allow"
    statement.Action == "*"
    statement.Resource == "*"
    msg := sprintf("IAM Role '%s' has a policy with Allow '*:*', which is forbidden.", [input.name])
}
