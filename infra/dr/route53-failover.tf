resource "aws_route53_health_check" "primary" {
  type = "HTTPS"
  resource_path = "/healthz"
  fqdn = "api.prod.example.com"
}

resource "aws_route53_record" "api" {
  zone_id = var.zone_id
  name    = "api.prod.example.com"
  type    = "A"
  set_identifier = "primary"
  failover_routing_policy { type = "PRIMARY" }
  alias { name = aws_lb.primary.dns_name, zone_id = aws_lb.primary.zone_id, evaluate_target_health = true }
  health_check_id = aws_route53_health_check.primary.id
}