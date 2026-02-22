# VPC Deployment (Summit Cloud / Private Cloud)

Deploy Summit Enterprise adjacent to your existing cloud infrastructure (AWS/Azure/GCP).

## Architecture

- **Private Subnets**: DBs and agents run in private subnets with no public IP.
- **Load Balancer**: ALB/NLB for secure API access.
- **IAM Integration**: Use AWS IAM or Azure AD for identity federation.

## Configuration

Use the Terraform modules in `deploy/terraform` to provision the infrastructure.

```bash
cd deploy/terraform/vpc
terraform init
terraform apply -var="vpc_id=vpc-12345"
```

## Connectivity

- Peer the VPC with your existing data VPCs for secure data access.
- Use VPC Endpoints for S3/Blob Storage access.
