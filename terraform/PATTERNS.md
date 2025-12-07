# IntelGraph Terraform Patterns

## Modules
- **EKS**: Use `modules/eks` for standard cluster configuration with OIDC and Karpenter.
- **RDS**: Use `modules/rds-postgres` for high-availability PostgreSQL.
- **S3**: Use `modules/s3-backups` for secure, versioned storage.

## Environments
- **Staging**: `envs/staging` - reduced redundancy, lower cost.
- **Production**: `envs/prod` - multi-AZ, high availability, PITR enabled.

## Disaster Recovery
- **PITR**: Point-in-Time Recovery is enabled by default in `modules/rds-postgres` with 7-day retention.
- **Cross-Region**: Replication buckets are configured in `modules/s3-object-lock`.
