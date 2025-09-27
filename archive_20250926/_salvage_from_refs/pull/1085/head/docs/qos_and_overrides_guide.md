# Conductor QoS & Overrides Guide

This document provides a comprehensive overview of the Quality of Service (QoS) features in the Conductor system. It covers static configuration, dynamic administrative overrides, automated reminders, and the soft-degrade system for tenant upgrade recommendations.

---

## 1. QoS Configuration (`router/qos.yaml`)

The primary QoS policy is defined in `router/qos.yaml`. This file allows for defining behavior on a per-tier basis, with the ability to specify finer-grained controls for individual experts within each tier.

### Structure

The configuration is organized by `classes` (tenant tiers). Each class has a default `explore_max` and can contain an `experts` block for overrides.

- `explore_max`: A float between 0.0 and 1.0 representing the maximum exploration percentage allowed for the tier.
- `experts`: An optional map where each key is an expert name. This allows for setting a different `explore_max` for a specific expert, which will override the tier's default.

### Example (`qos.yaml`)

```yaml
classes:
  team:
    explore_max: 0.05
    experts:
      graph_ops: { explore_max: 0.05 }

  business:
    explore_max: 0.08
    experts:
      osint_analysis: { explore_max: 0.12 } # Business tier gets a higher cap for this expert

  enterprise:
    explore_max: 0.02
    experts: {}
```

---

## 2. Admin Overrides API

For temporary, dynamic adjustments, administrators can use the QoS Overrides API. This is useful for tactical situations like supporting a high-value tenant through a critical project without requiring a permanent configuration change.

**Authentication:** All endpoints require the `admin` role.

### Create an Override

Creates a temporary override for a specific tenant and, optionally, a specific expert.

- **Endpoint:** `POST /admin/qos/override`
- **Payload:**
  ```json
  {
    "tenant_id": "string",
    "expert": "string", // Optional, applies to all experts if omitted
    "explore_max": "number", // 0.0 to 1.0
    "ttl_minutes": "integer", // 5 to 14400
    "reason": "string"
  }
  ```
- **Example:**
  ```bash
  curl -X POST "$ADMIN_URL/admin/qos/override" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d 
    '{
      "tenant_id": "tnt-team-b43f",
      "expert": "rag_retrieval",
      "explore_max": 0.10,
      "ttl_minutes": 10080,
      "reason": "Temp relief for critical project"
    }'
  ```

### Extend an Override

Extends the `expires_at` timestamp of an existing, active override.

- **Endpoint:** `POST /admin/qos/override/:id/extend`
- **Payload:**
  ```json
  {
    "reason": "string",
    "extend_minutes": "integer" // Optional, defaults to 7 days
  }
  ```
- **Example:**
  ```bash
  curl -X POST "$ADMIN_URL/admin/qos/override/123/extend" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"reason": "Project extended"}'
  ```

---

## 3. Automated Expiry Reminders

A Kubernetes CronJob (`qos-override-reminder`) runs hourly to ensure overrides do not expire unexpectedly.

- **Logic:** The job queries the `qos_overrides` table for any overrides that will expire within the next 24 hours.
- **Notification:** If any are found, a summary is posted to the **`#qos-csm`** Slack channel.
- **Action:** This allows the CSM or admin team to proactively extend the override or engage with the customer about a tier upgrade.

---

## 4. Soft-Degrade Upgrade Notices

To encourage users to move to appropriate tiers without blocking their work, we use a non-blocking "soft-degrade" system.

- **Mechanism:**
  1. A materialized view (`mv_cap_hits_30d`) aggregates the number of `exploration cap exceeded` denials for each tenant over a rolling 30-day window.
  2. A daily script (`upgrade_notices.ts`) checks this view. If a tenant exceeds a predefined threshold (e.g., 50 hits), it generates a notice.
  3. These notices are stored in the `tenant_notices` table with a 7-day TTL.
- **User Experience:** The frontend polls the `/admin/notices` endpoint. If a notice exists for the current tenant, it displays a non-blocking informational banner suggesting an upgrade.
- **Endpoint:** `GET /admin/notices` (scoped to the authenticated user's tenant).

---

## 5. Monitoring & Observability

- **Prometheus Metrics:**
  - `admission_decision_total{decision,tier,expert,reason}`: A counter for every decision made by the admission controller. This is the primary metric for monitoring the health of the QoS system.
- **Grafana Dashboard:**
  - **`QoS Tenant Health`**: Located in the `/Platform/QoS` folder, this dashboard displays the top tenants by exploration cap denials over a 30-day period. It includes a link to create an upgrade ticket in Slack, facilitating a quick handoff to the CSM team.
