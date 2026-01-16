# Architecture FAQ

**Q: Can we run Summit in our own AWS account?**
A: Yes, we support "Bring Your Own Cloud" (single-tenant) deployments. See the [Cloud Single-Tenant Reference Architecture](../reference-architectures/cloud-single-tenant.md).

**Q: Does Summit support multi-region failover?**
A: Yes, the architecture supports active-passive multi-region deployments with asynchronous data replication.

**Q: What is the expected latency?**
A: API p95 latency is typically under 200ms for core operations.

**Q: How do you handle data isolation in multi-tenant environments?**
A: We use logical isolation with strict Row-Level Security (RLS) in the database and namespace isolation in Kubernetes.

**Q: Can we use our own key management system (KMS)?**
A: Yes, Enterprise plans support Customer Managed Keys (CMK) for encryption at rest.
