## 8. DR Game Days and Regional Failover

### 8.1. Quarterly DR Simulation

- **Purpose**: To regularly test the effectiveness of the DR plan and identify any gaps or areas for improvement.
- **Frequency**: Quarterly.
- **Scope**: Full failover to a secondary region, including all data stores and application services.
- **Activities**:
  - Simulate a disaster scenario (e.g., primary region outage).
  - Execute the DR runbook.
  - Measure RPO and RTO adherence.
  - Document lessons learned and action items.

### 8.2. Regional Traffic Shift Procedures

- **Purpose**: To safely and efficiently shift user traffic between primary and secondary regions during a disaster or planned maintenance.
- **Tools**: DNS (Route 53, Cloudflare), Global Load Balancers (AWS Global Accelerator, Azure Front Door).
- **Procedure**:
  - **Pre-shift Checks**: Verify health of the target region.
  - **Traffic Diversion**: Update DNS records or load balancer configurations to direct traffic to the secondary region.
  - **Monitoring**: Closely monitor traffic, latency, and error rates during the shift.
  - **Verification**: Confirm all traffic is routed to the secondary region and services are operational.
  - **Rollback**: Have a clear plan to revert traffic if issues arise.
