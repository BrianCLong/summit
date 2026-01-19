# On-Premise Deployment Hardening Guide

## Overview
For customers deploying Summit on their own infrastructure (VMware, Bare Metal, K8s).

## 1. Host Security
*   **OS Hardening**: Follow CIS Benchmarks for the host OS (e.g., Ubuntu, RHEL).
*   **SSH**: Disable password auth, use keys only. Restrict to VPN/Bastion.

## 2. Container Security
*   **Rootless**: Run containers as non-root user (UID > 1000).
*   **Read-Only**: Mount root filesystem as read-only where possible.

## 3. Database Security
*   **PostgreSQL**: Change default passwords immediately.
*   **Network**: Bind to internal interfaces only.

## 4. Key Management
*   **Secrets**: Do not hardcode secrets in `docker-compose.yml`. Use environment variables injected from a secure vault (HashiCorp Vault, CyberArk).
