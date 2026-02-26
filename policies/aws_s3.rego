package aws.s3

import future.keywords

deny[msg] {
  some acl in input.attributes.acl
  acl.grantee == "AllUsers"
  msg := "Public S3 bucket detected"
}
