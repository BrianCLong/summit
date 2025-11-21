# Hybrid Connectivity Module
# Provides cross-cloud VPN, peering, and SD-WAN integration

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# Variables
variable "aws_vpc_id" {
  description = "AWS VPC ID"
  type        = string
}

variable "azure_vnet_id" {
  description = "Azure VNet ID"
  type        = string
}

variable "gcp_network_id" {
  description = "GCP Network ID"
  type        = string
}

variable "enable_cross_cloud_peering" {
  description = "Enable cross-cloud VPC peering"
  type        = bool
  default     = true
}

variable "enable_sd_wan" {
  description = "Enable SD-WAN integration"
  type        = bool
  default     = false
}

variable "vpn_shared_secret" {
  description = "Shared secret for VPN connections"
  type        = string
  sensitive   = true
}

variable "on_premise_cidrs" {
  description = "On-premise network CIDRs"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}

# AWS VPN Gateway Configuration
resource "aws_vpn_gateway" "hybrid" {
  vpc_id = var.aws_vpc_id

  tags = merge(
    var.tags,
    {
      Name = "summit-hybrid-vpn-gw"
    }
  )
}

# AWS Customer Gateway (for on-premise connection)
resource "aws_customer_gateway" "on_premise" {
  count = length(var.on_premise_cidrs) > 0 ? 1 : 0

  bgp_asn    = 65000
  ip_address = "0.0.0.0" # Replace with actual on-premise IP
  type       = "ipsec.1"

  tags = merge(
    var.tags,
    {
      Name = "summit-on-premise-cgw"
    }
  )
}

# AWS VPN Connection to on-premise
resource "aws_vpn_connection" "on_premise" {
  count = length(var.on_premise_cidrs) > 0 ? 1 : 0

  vpn_gateway_id      = aws_vpn_gateway.hybrid.id
  customer_gateway_id = aws_customer_gateway.on_premise[0].id
  type                = "ipsec.1"
  static_routes_only  = true

  tunnel1_preshared_key = var.vpn_shared_secret
  tunnel2_preshared_key = var.vpn_shared_secret

  tags = merge(
    var.tags,
    {
      Name = "summit-on-premise-vpn"
    }
  )
}

# AWS Transit Gateway for multi-cloud connectivity
resource "aws_ec2_transit_gateway" "main" {
  description                     = "Summit Multi-Cloud Transit Gateway"
  auto_accept_shared_attachments  = "enable"
  default_route_table_association = "enable"
  default_route_table_propagation = "enable"
  vpn_ecmp_support                = "enable"

  tags = merge(
    var.tags,
    {
      Name = "summit-tgw"
    }
  )
}

resource "aws_ec2_transit_gateway_vpc_attachment" "main" {
  subnet_ids         = data.aws_subnets.private.ids
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = var.aws_vpc_id

  tags = merge(
    var.tags,
    {
      Name = "summit-tgw-attachment"
    }
  )
}

# Cross-Cloud VPN: AWS to GCP
resource "aws_customer_gateway" "gcp" {
  count = var.enable_cross_cloud_peering ? 1 : 0

  bgp_asn    = 65515
  ip_address = google_compute_address.vpn[0].address
  type       = "ipsec.1"

  tags = merge(
    var.tags,
    {
      Name = "summit-gcp-cgw"
    }
  )
}

resource "aws_vpn_connection" "to_gcp" {
  count = var.enable_cross_cloud_peering ? 1 : 0

  vpn_gateway_id      = aws_vpn_gateway.hybrid.id
  customer_gateway_id = aws_customer_gateway.gcp[0].id
  type                = "ipsec.1"
  static_routes_only  = false

  tunnel1_preshared_key = var.vpn_shared_secret
  tunnel2_preshared_key = var.vpn_shared_secret

  tags = merge(
    var.tags,
    {
      Name = "summit-aws-to-gcp-vpn"
    }
  )
}

# GCP Cloud VPN
resource "google_compute_address" "vpn" {
  count = var.enable_cross_cloud_peering ? 1 : 0

  name         = "summit-vpn-ip"
  address_type = "EXTERNAL"
}

resource "google_compute_vpn_gateway" "to_aws" {
  count = var.enable_cross_cloud_peering ? 1 : 0

  name    = "summit-vpn-gw-to-aws"
  network = var.gcp_network_id
}

resource "google_compute_vpn_tunnel" "to_aws" {
  count = var.enable_cross_cloud_peering ? 1 : 0

  name                    = "summit-vpn-tunnel-to-aws"
  peer_ip                 = aws_vpn_connection.to_gcp[0].tunnel1_address
  shared_secret           = var.vpn_shared_secret
  target_vpn_gateway      = google_compute_vpn_gateway.to_aws[0].id
  local_traffic_selector  = ["0.0.0.0/0"]
  remote_traffic_selector = ["0.0.0.0/0"]

  depends_on = [
    google_compute_forwarding_rule.esp,
    google_compute_forwarding_rule.udp500,
    google_compute_forwarding_rule.udp4500
  ]
}

resource "google_compute_forwarding_rule" "esp" {
  count = var.enable_cross_cloud_peering ? 1 : 0

  name        = "summit-vpn-esp"
  ip_protocol = "ESP"
  ip_address  = google_compute_address.vpn[0].address
  target      = google_compute_vpn_gateway.to_aws[0].self_link
}

resource "google_compute_forwarding_rule" "udp500" {
  count = var.enable_cross_cloud_peering ? 1 : 0

  name        = "summit-vpn-udp500"
  ip_protocol = "UDP"
  port_range  = "500"
  ip_address  = google_compute_address.vpn[0].address
  target      = google_compute_vpn_gateway.to_aws[0].self_link
}

resource "google_compute_forwarding_rule" "udp4500" {
  count = var.enable_cross_cloud_peering ? 1 : 0

  name        = "summit-vpn-udp4500"
  ip_protocol = "UDP"
  port_range  = "4500"
  ip_address  = google_compute_address.vpn[0].address
  target      = google_compute_vpn_gateway.to_aws[0].self_link
}

# GCP Route to AWS
resource "google_compute_route" "to_aws" {
  count = var.enable_cross_cloud_peering ? 1 : 0

  name                = "summit-route-to-aws"
  network             = var.gcp_network_id
  dest_range          = "10.0.0.0/16" # AWS VPC CIDR
  next_hop_vpn_tunnel = google_compute_vpn_tunnel.to_aws[0].self_link
  priority            = 1000
}

# Data sources
data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [var.aws_vpc_id]
  }

  tags = {
    Tier = "private"
  }
}

# Outputs
output "aws_transit_gateway_id" {
  value = aws_ec2_transit_gateway.main.id
}

output "aws_vpn_gateway_id" {
  value = aws_vpn_gateway.hybrid.id
}

output "gcp_vpn_gateway_id" {
  value = var.enable_cross_cloud_peering ? google_compute_vpn_gateway.to_aws[0].id : null
}

output "vpn_tunnel_status" {
  value = var.enable_cross_cloud_peering ? {
    aws_to_gcp = aws_vpn_connection.to_gcp[0].tunnel1_bgp_asn
    gcp_to_aws = google_compute_vpn_tunnel.to_aws[0].detailed_status
  } : null
}
