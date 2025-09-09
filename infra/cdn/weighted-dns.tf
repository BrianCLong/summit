resource "aws_route53_record" "web_blue" {
  zone_id = var.zone_id
  name    = var.host
  type    = "A"
  set_identifier = "blue"
  weighted_routing_policy { weight = 90 }
  alias { name = aws_cloudfront_distribution.blue.domain_name, zone_id = aws_cloudfront_distribution.blue.hosted_zone_id, evaluate_target_health = false }
}
resource "aws_route53_record" "web_green" {
  zone_id = var.zone_id
  name    = var.host
  type    = "A"
  set_identifier = "green"
  weighted_routing_policy { weight = 10 }
  alias { name = aws_cloudfront_distribution.green.domain_name, zone_id = aws_cloudfront_distribution.green.hosted_zone_id, evaluate_target_health = false }
}