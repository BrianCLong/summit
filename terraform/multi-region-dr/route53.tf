# --- Route53 Health Checks & Latency Routing ---

resource "aws_route53_zone" "main" {
  provider = aws.primary
  name     = var.domain_name
}

# Health Checks for Regional Origins
resource "aws_route53_health_check" "primary" {
  provider          = aws.primary
  fqdn              = aws_lb.primary.dns_name
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = "3"
  request_interval  = "30"
  tags = {
    Name = "primary-health-check"
  }
}

resource "aws_route53_health_check" "secondary" {
  provider          = aws.primary
  fqdn              = aws_lb.secondary.dns_name
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = "3"
  request_interval  = "30"
  tags = {
    Name = "secondary-health-check"
  }
}

# Global Alias Record pointing to CloudFront
# CloudFront handles the failover using Origin Groups, but we still use R53 for the domain.
resource "aws_route53_record" "api" {
  provider = aws.primary
  zone_id  = aws_route53_zone.main.zone_id
  name     = "api.${var.domain_name}"
  type     = "A"

  alias {
    name                   = aws_cloudfront_distribution.global_cdn.domain_name
    zone_id                = aws_cloudfront_distribution.global_cdn.hosted_zone_id
    evaluate_target_health = true
  }
}
