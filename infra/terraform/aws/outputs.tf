output "region_shards" {
  description = "Computed sharding plan for the primary region and all replicas"
  value       = local.region_shards
}

output "tenant_region_assignments" {
  description = "Map of tenants to their preferred regions and fallback order"
  value       = local.tenant_region_assignments
}
