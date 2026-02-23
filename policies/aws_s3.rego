
package maestro.governance

# Deny S3 buckets with PublicRead or PublicReadWrite ACLs
deny[msg] {
    input.asset_type == "aws_s3_bucket"
    acl := input.attributes.acl[_]
    acl == "PublicRead"
    msg := sprintf("S3 Bucket '%s' has a PublicRead ACL, which is forbidden.", [input.name])
}

deny[msg] {
    input.asset_type == "aws_s3_bucket"
    acl := input.attributes.acl[_]
    acl == "PublicReadWrite"
    msg := sprintf("S3 Bucket '%s' has a PublicReadWrite ACL, which is forbidden.", [input.name])
}
