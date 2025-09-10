resource "aws_ec2_tag" "example" {
  resource_id = "i-1234567890abcdef0"
  key         = "CostCenter"
  value       = "IT"
}