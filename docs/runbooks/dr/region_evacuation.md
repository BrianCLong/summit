# Region Evacuation Runbook

This runbook outlines the steps to evacuate the CompanyOS platform from one AWS region to another in a disaster recovery scenario.

## Prerequisites

- A pre-provisioned disaster recovery (DR) environment in the target region.
- Regular backups of RDS PostgreSQL and Neo4j (via Velero and S3 snapshots).
- Terraform state files are stored remotely and accessible.
- DNS records are managed by ExternalDNS or a similar system.

## Steps

1.  **Declare Disaster:** Confirm the primary region is unrecoverable or severely degraded.

2.  **Activate DR Environment (Terraform):**
    - Navigate to your infrastructure-as-code repository.
    - Switch to the DR branch or apply the DR-specific Terraform configuration for the target region.
    - Ensure all necessary infrastructure (VPC, EKS, RDS, S3 buckets, etc.) is provisioned.

    ```bash
    terraform -chdir=infra/aws/dr-region init
    terraform -chdir=infra/aws/dr-region apply -var="region=<TARGET_REGION>" # Example
    ```

3.  **Restore Data (RDS PostgreSQL):**
    - Identify the latest successful backup of your RDS instance.
    - Restore the RDS instance to the DR region. This might involve cross-region snapshot copy and then restore, or using PITR if the primary is still partially accessible.
    - Update the application configuration in the DR environment to point to the restored RDS endpoint.

4.  **Restore Data (Neo4j):**
    - Identify the latest successful S3 snapshot of your Neo4j database.
    - Restore Neo4j data to the newly provisioned Neo4j instance in the DR region.
    - Update the application configuration in the DR environment to point to the restored Neo4j instance.

5.  **Restore Kubernetes Workloads (Velero):**
    - Deploy Velero to the DR EKS cluster.
    - Configure Velero to access the backup storage location (S3 bucket) in the DR region.
    - Perform a restore of the Kubernetes applications.

    ```bash
    velero restore create <RESTORE_NAME> --from-backup <LATEST_BACKUP_NAME>
    ```

6.  **Update DNS Records:**
    - Once applications are restored and healthy in the DR region, update DNS records to point to the new ingress controllers/load balancers in the DR region.
    - If using ExternalDNS, ensure it's configured in the DR cluster and will reconcile the records.

7.  **Verify Functionality:**
    - Perform comprehensive smoke tests and health checks on the deployed applications in the DR region.
    - Validate data integrity and application functionality.

8.  **Post-Evacuation Actions:**
    - Monitor the DR environment closely.
    - Plan for re-establishing a DR strategy from the new primary region.
    - Conduct a post-mortem analysis of the disaster.
