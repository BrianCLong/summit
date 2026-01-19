# Cloud Deployment Hardening Guide

## Overview
This guide provides security hardening recommendations for deploying Summit in a cloud environment (AWS/Azure/GCP).

## 1. Network Security
*   **VPC Isolation**: Deploy Summit in a dedicated VPC.
*   **Subnets**: Use private subnets for all application and database workloads. Only Load Balancers should be in public subnets.
*   **Security Groups**:
    *   `lb-sg`: Allow 443 from 0.0.0.0/0.
    *   `app-sg`: Allow 4000 from `lb-sg`.
    *   `db-sg`: Allow 5432 from `app-sg`.

## 2. IAM & Access
*   **Least Privilege**: Use IAM Roles for Service Accounts (IRSA). Do not mount static AWS credentials.
*   **MFA**: Enforce MFA for all console access.

## 3. Data Protection
*   **Encryption at Rest**: Enable AES-256 (KMS) for RDS and S3.
*   **Encryption in Transit**: Terminate TLS at the Load Balancer. Use TLS 1.2 or higher.

## 4. Logging & Monitoring
*   **CloudTrail/Audit Logs**: Enable for all regions.
*   **App Logs**: Ship stdout/stderr to CloudWatch/Splunk.
