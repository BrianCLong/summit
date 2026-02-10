
package maestro.governance

import future.keywords

# Deny public S3 buckets
deny[msg] {
    input.asset_type == "aws_s3_bucket"
    some acl in input.attributes.acl
    acl.grantee.uri == "http://acs.amazonaws.com/groups/global/AllUsers"
    msg := sprintf("S3 bucket '%s' has a public ACL grant, which is forbidden.", [input.name])
}

deny[msg] {
    input.asset_type == "aws_s3_bucket"
    input.attributes.policy.Statement[_].Principal == "*"
    msg := sprintf("S3 bucket '%s' has a public policy statement, which is forbidden.", [input.name])
}
