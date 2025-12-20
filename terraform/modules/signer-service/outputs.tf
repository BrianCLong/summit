output "policy_bundle_bucket" {
  value       = aws_s3_bucket.policy_bundles.bucket
  description = "Bucket where signer policy bundles are stored"
}

output "dashboard_bucket" {
  value       = aws_s3_bucket.dashboards.bucket
  description = "Bucket backing Grafana dashboard sync"
}

output "bundle_manifest_key" {
  value       = aws_s3_object.bundle_manifest.key
  description = "Manifest key that verifiers can watch for bundle changes"
}
