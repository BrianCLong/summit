# Admin Panel Documentation

> **Version**: 1.0.0
> **Last Updated**: 2025-11-20
> **Purpose**: Comprehensive guide for Summit/IntelGraph admin panel features, access controls, and operations

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Access Control](#access-control)
4. [Features](#features)
5. [User Management](#user-management)
6. [Audit Logging](#audit-logging)
7. [Content Moderation](#content-moderation)
8. [Feature Flags](#feature-flags)
9. [Data Exports](#data-exports)
10. [System Configuration](#system-configuration)
11. [Alerts](#alerts)
12. [Security & Compliance](#security--compliance)
13. [API Reference](#api-reference)
14. [Troubleshooting](#troubleshooting)

---

## Overview

The Summit/IntelGraph Admin Panel provides comprehensive administrative capabilities for managing users, monitoring system health, moderating content, and configuring platform features. All admin operations are subject to strict role-based access control (RBAC) and are fully audited.

### Key Capabilities

- **User Management**: Create, edit, suspend, delete, and impersonate users
- **Audit Logging**: Comprehensive audit trail with advanced search and filtering
- **Content Moderation**: Queue-based workflow for reviewing reported content
- **Feature Flags**: Dynamic feature rollout and A/B testing
- **Data Exports**: Export user data, audit logs, and analytics
- **System Configuration**: Runtime configuration management
- **Alerts**: Real-time monitoring and alerting system
- **Dashboard**: Real-time metrics and system health overview

### Design Principles

1. **Security First**: All operations require authentication and authorization
2. **Audit Everything**: Every admin action is logged with full context
3. **Principle of Least Privilege**: Users have minimum required permissions
4. **Compliance Ready**: Built-in support for SOC2, GDPR, and other frameworks
5. **Self-Service**: Reduce operational overhead through automation

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Admin Dashboard (React)                  │
│  ┌──────────┬───────────┬────────────┬──────────────────┐  │
│  │Dashboard │   Users   │ Moderation │  Feature Flags   │  │
│  ├──────────┼───────────┼────────────┼──────────────────┤  │
│  │  Audit   │  Exports  │   Config   │     Alerts       │  │
│  └──────────┴───────────┴────────────┴──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓ GraphQL API
┌─────────────────────────────────────────────────────────────┐
│              GraphQL Resolvers (adminPanelResolvers.ts)      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Authorization Middleware (requireAdmin, etc.)       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│          Admin Panel Service (AdminPanelService.ts)          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  User Management │ Audit Logs │ Moderation │ Flags   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL Database (admin_panel_schema.sql)    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ users │ audit_logs │ moderation_queue │ feature_flags│  │
│  │ user_impersonations │ admin_alerts │ data_exports   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↑
┌─────────────────────────────────────────────────────────────┐
│                  OPA Policy Engine (admin-panel.rego)        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  RBAC Rules │ Geo-Restrictions │ Rate Limits        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User initiates action** in Admin Dashboard UI
2. **GraphQL mutation/query** sent to API server
3. **Authorization check** via OPA policy engine
4. **Resolver validates** input and permissions
5. **Service executes** business logic
6. **Database updated** (if mutation)
7. **Audit log created** for all mutations
8. **Response returned** to UI
9. **UI updates** with new data

### Database Schema

See `/server/db/migrations/postgres/2025-11-20_admin_panel_schema.sql` for complete schema.

**Key Tables:**

- `users` - Extended with admin fields (suspended, last_login, etc.)
- `audit_logs` - All system actions with full context
- `user_impersonations` - Track admin impersonation sessions
- `moderation_queue` - Content moderation workflow
- `feature_flags` - Feature flag configuration
- `admin_alerts` - System alerts and notifications
- `data_exports` - Export job tracking
- `system_config` - Runtime configuration
- `admin_activity_log` - Admin-specific actions

---

## Access Control

### Roles

| Role | Capabilities | Access Level |
|------|-------------|--------------|
| **PLATFORM_ADMIN** | Full access to all admin operations across all tenants | Global |
| **ADMIN** | Full access to admin operations within their tenant | Tenant |
| **MODERATOR** | Content moderation only | Limited |
| **ANALYST** | No admin access | None |
| **VIEWER** | No admin access | None |

### Permission Model

Access is controlled by **OPA policies** (`/policy/admin-panel.rego`). All admin operations check:

1. **Role-based access**: User has required role
2. **Tenant isolation**: User can only access their tenant (unless PLATFORM_ADMIN)
3. **Resource ownership**: Cannot modify higher-privileged users
4. **Rate limits**: Operations throttled per user
5. **Geo-restrictions**: Some operations restricted by region
6. **MFA requirements**: Sensitive operations require MFA

### Operation Matrix

| Operation | Platform Admin | Admin | Moderator |
|-----------|:--------------:|:-----:|:---------:|
| View dashboard | ✅ | ✅ (tenant) | ❌ |
| Create user | ✅ | ✅ (tenant) | ❌ |
| Edit user | ✅ | ✅ (tenant, non-admin) | ❌ |
| Suspend user | ✅ | ✅ (tenant, non-admin) | ❌ |
| Delete user | ✅ | ✅ (tenant, non-admin) | ❌ |
| Impersonate user | ✅ | ✅ (tenant, non-admin) | ❌ |
| View audit logs | ✅ | ✅ (tenant) | ❌ |
| Moderate content | ✅ | ✅ | ✅ |
| Manage feature flags | ✅ | ✅ (tenant) | ❌ |
| Export data | ✅ | ✅ (tenant) | ❌ |
| System config | ✅ | 👁️ (read-only) | ❌ |
| Manage alerts | ✅ | ✅ (tenant) | ❌ |

**Legend:** ✅ = Full Access, 👁️ = Read-Only, ❌ = No Access

---

## Features

### 1. Dashboard Overview

**Path:** `/admin` → Dashboard tab

Real-time overview of system health and key metrics:

- **User Statistics**: Total users, active users, new registrations, role distribution
- **Activity Metrics**: Daily/weekly active users, login trends
- **Audit Summary**: Event counts, success rates, top actions
- **Moderation Queue**: Pending items, critical flags, avg resolution time
- **System Alerts**: Active alerts by severity and type

**Refresh Interval:** 30 seconds (auto-refresh)

**Visualizations:**
- Pie chart: User distribution by role
- Bar chart: Top audit actions
- Line chart: Activity trends (future enhancement)

---

## User Management

### Overview

Complete user lifecycle management with advanced search, filtering, and bulk operations.

### Features

#### Search & Filter

- **Text search**: Name, email, username
- **Role filter**: ADMIN, ANALYST, VIEWER, MODERATOR
- **Status filter**: Active, Inactive, Suspended
- **Date filters**: Created after/before, last login after/before

#### User Operations

##### Create User

```typescript
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    email
    fullName
    role
  }
}
```

**Required Fields:**
- `email` (unique)
- `password`
- `role`

**Optional Fields:**
- `username`
- `firstName`, `lastName`
- `metadata` (JSONB)

**Audit Log:** `admin.user.create`

##### Edit User

Update user profile, role, or status.

**Restrictions:**
- Cannot elevate to PLATFORM_ADMIN (unless you are one)
- Cannot modify PLATFORM_ADMIN users (unless you are one)
- Cannot change your own role

**Audit Log:** `admin.user.update`

##### Suspend User

Temporarily disable user account with reason.

**Inputs:**
- `userId` - Target user ID
- `reason` - Required explanation
- `duration` - Optional duration in minutes (null = indefinite)

**Effects:**
- User cannot log in
- Active sessions terminated
- `isSuspended` flag set to `true`
- Suspension reason and timestamp recorded

**Restrictions:**
- Cannot suspend self
- Cannot suspend admins (unless PLATFORM_ADMIN)

**Audit Log:** `admin.user.suspend`

**Unsuspend:**

```typescript
mutation UnsuspendUser($userId: ID!, $reason: String!) {
  unsuspendUser(userId: $userId, reason: $reason) {
    id
    isSuspended
  }
}
```

##### Delete User

Soft-delete user account (sets `isActive = false`).

**Warning:** This is a destructive operation. User data is retained for audit purposes but account is deactivated.

**Required:** Reason for deletion

**Restrictions:**
- Cannot delete self
- Cannot delete admins (unless PLATFORM_ADMIN)

**Audit Log:** `admin.user.delete`

##### Reset Password

Generate temporary password for user.

**Flow:**
1. Admin clicks "Reset Password"
2. System generates secure random password
3. Password displayed to admin (copy to clipboard)
4. User must change password on next login

**Security:**
- Temporary password is only shown once
- All password resets are audited
- User receives email notification (if configured)

**Audit Log:** `admin.user.password_reset`

##### Impersonate User

Temporarily assume user's identity for troubleshooting.

**⚠️ Warning:** Powerful feature with strict compliance requirements.

**Requirements:**
- Admin or Platform Admin role
- Reason for impersonation (required)
- MFA verification (in production)
- Trusted IP address

**Restrictions:**
- Cannot impersonate admins (unless PLATFORM_ADMIN)
- Rate limited: 10 per hour
- All actions logged with `[IMPERSONATED]` flag
- Cannot perform destructive admin operations while impersonating

**Audit Logs:**
- `admin.impersonation.start`
- `admin.impersonation.end`
- All actions during impersonation tagged

**Compliance:**
- Impersonation sessions tracked in `user_impersonations` table
- Start/end timestamps, IP address, user agent recorded
- Visible in audit reports and compliance exports

**End Impersonation:**

```typescript
mutation EndImpersonation($impersonationId: ID!) {
  endImpersonation(impersonationId: $impersonationId) {
    id
    endedAt
  }
}
```

#### Bulk Operations

Perform operations on multiple users at once:

- **Bulk Suspend**: Suspend multiple users with single reason
- **Bulk Update Role**: Change role for multiple users
- **Bulk Delete**: Delete multiple users

**Restrictions:**
- Maximum 100 users per bulk operation
- Reason required for destructive operations
- Same permission checks as individual operations

---

## Audit Logging

### Overview

Comprehensive audit trail for all user and admin actions. Every mutation emits an audit event with full context.

### Audit Log Schema

```typescript
interface AuditLog {
  id: string;
  timestamp: Date;
  userId?: string;                // Actor
  action: string;                 // e.g., "admin.user.suspend"
  resourceType: string;           // e.g., "user"
  resourceId?: string;            // Target resource
  details?: Record<string, any>;  // Action-specific data
  ipAddress?: string;             // Origin IP
  userAgent?: string;             // Browser/client
  status: 'success' | 'failure' | 'error';
  errorMessage?: string;          // If status != success
  tenantId?: string;              // Tenant context
  sessionId?: string;             // Session identifier
  requestId?: string;             // Request correlation ID
  metadata?: Record<string, any>; // Additional context
}
```

### Audit Actions

**User Actions:**
- `admin.user.create`
- `admin.user.update`
- `admin.user.suspend`
- `admin.user.unsuspend`
- `admin.user.delete`
- `admin.user.password_reset`

**Impersonation:**
- `admin.impersonation.start`
- `admin.impersonation.end`

**Moderation:**
- `admin.moderation.review`
- `admin.moderation.assign`
- `admin.moderation.escalate`

**Feature Flags:**
- `admin.feature_flag.create`
- `admin.feature_flag.update`
- `admin.feature_flag.delete`

**Configuration:**
- `admin.config.update`

**Exports:**
- `admin.export.create`
- `admin.export.download`

### Search & Filter

**Filters:**
- User ID (actor)
- Action type
- Resource type/ID
- Status (success/failure/error)
- Date range
- Tenant ID

**Example Query:**

```graphql
query AuditLogs($filters: AuditLogFilters!) {
  auditLogs(first: 100, filters: $filters) {
    edges {
      node {
        id
        timestamp
        user {
          fullName
          email
        }
        action
        resourceType
        resourceId
        details
        status
      }
    }
    totalCount
  }
}
```

### Retention

- **Default retention**: 365 days (configurable via `system_config`)
- **Compliance exports**: Long-term archival via data exports
- **Immutable**: Audit logs cannot be modified or deleted
- **Partitioned**: Monthly partitions for performance (optional)

### Views

**Pre-built summary views:**
- `admin_audit_summary` - Daily aggregates
- Recent events by user
- Failed operations report
- High-risk actions (suspension, deletion, impersonation)

---

## Content Moderation

### Overview

Queue-based workflow for reviewing user-reported content (entities, relationships, investigations, comments).

### Moderation Item Schema

```typescript
interface ModerationItem {
  id: string;
  contentType: string;        // entity, relationship, investigation, comment
  contentId: string;          // ID of reported content
  reporter: User;             // Who reported it
  reason: string;             // Why it was reported
  category: ModerationCategory; // ABUSE, SPAM, INAPPROPRIATE, VIOLATION, OTHER
  status: ModerationStatus;   // pending, approved, rejected, escalated
  priority: ModerationPriority; // low, normal, high, critical
  assignedTo?: User;          // Moderator assigned
  reviewedBy?: User;          // Who reviewed it
  reviewedAt?: Date;
  resolution?: string;        // Outcome description
  actionTaken?: string;       // content_removed, user_warned, etc.
  notes?: string;             // Reviewer notes
  createdAt: Date;
  updatedAt: Date;
}
```

### Workflow

1. **Content Reported** → Item added to queue with priority
2. **Auto-Assignment** (optional) → Moderator assigned based on availability
3. **Review** → Moderator examines content and context
4. **Decision** → Approve (no action), Reject (take action), or Escalate
5. **Action** → Remove content, warn user, suspend user, etc.
6. **Resolution** → Item closed with notes

### Operations

#### Review Moderation Item

```graphql
mutation ReviewModeration($input: ReviewModerationInput!) {
  reviewModeration(input: $input) {
    id
    status
    resolution
    actionTaken
  }
}
```

**Inputs:**
- `itemId` - Moderation item ID
- `status` - APPROVED, REJECTED, ESCALATED
- `actionTaken` - no_action, content_removed, user_warned, user_suspended
- `resolution` - Description of outcome
- `notes` - Internal notes

**Audit Log:** `admin.moderation.review`

#### Assign Moderation

Manually assign item to specific moderator.

```graphql
mutation AssignModeration($itemId: ID!, $assignTo: ID!) {
  assignModeration(itemId: $itemId, assignTo: $assignTo) {
    id
    assignedTo {
      fullName
    }
  }
}
```

#### Escalate

Escalate to higher-level admin for complex cases.

```graphql
mutation EscalateModeration($itemId: ID!, $reason: String!) {
  escalateModeration(itemId: $itemId, reason: $reason) {
    id
    status
  }
}
```

### Metrics

- **Pending items**: Current queue size
- **Critical items**: High-priority items requiring immediate attention
- **Avg resolution time**: Time from report to resolution
- **Approval rate**: % of items approved vs. rejected

---

## Feature Flags

### Overview

Dynamic feature rollout and A/B testing with fine-grained targeting.

### Feature Flag Schema

```typescript
interface FeatureFlag {
  key: string;               // Unique identifier
  name: string;              // Display name
  description?: string;
  flagType: 'boolean' | 'string' | 'number' | 'json';
  defaultValue: any;
  enabled: boolean;
  rolloutPercentage: number; // 0-100
  targetUsers?: string[];    // Specific user IDs
  targetRoles?: UserRole[];  // Specific roles
  targetTenants?: string[];  // Specific tenants
  conditions?: Record<string, any>; // Advanced targeting
  tags?: string[];           // Categorization
}
```

### Operations

#### Create Feature Flag

```graphql
mutation CreateFeatureFlag($input: CreateFeatureFlagInput!) {
  createFeatureFlag(input: $input) {
    id
    key
    name
    enabled
  }
}
```

#### Update Feature Flag

```graphql
mutation UpdateFeatureFlag($id: ID!, $input: UpdateFeatureFlagInput!) {
  updateFeatureFlag(id: $id, input: $input) {
    id
    enabled
    rolloutPercentage
  }
}
```

**Change History:** All changes tracked in `feature_flag_history` table.

#### Toggle Feature Flag

Quick enable/disable:

```graphql
mutation ToggleFeatureFlag($id: ID!, $enabled: Boolean!, $reason: String) {
  toggleFeatureFlag(id: $id, enabled: $enabled, reason: $reason) {
    id
    enabled
  }
}
```

### Targeting Strategies

1. **Boolean flag**: Simple on/off
2. **Percentage rollout**: Gradual rollout (e.g., 10% of users)
3. **Targeted users**: Specific user IDs
4. **Role-based**: All users with specific role
5. **Tenant-based**: Specific tenants only
6. **Conditional**: Custom rules (e.g., region, subscription tier)

### Integration

Feature flags integrate with existing `FeatureFlagService.ts`. Admin UI provides management interface for flags defined in service configuration.

---

## Data Exports

### Overview

Export user data, audit logs, and analytics for compliance, backup, or analysis.

### Export Types

- **USERS**: User accounts and profiles
- **AUDIT_LOGS**: Audit trail within date range
- **ENTITIES**: Graph entities
- **INVESTIGATIONS**: Investigation data
- **MODERATION_QUEUE**: Moderation history
- **SYSTEM_METRICS**: Performance metrics
- **FULL_BACKUP**: Complete data export

### Export Formats

- **JSON**: Structured data (default)
- **CSV**: Tabular data
- **XLSX**: Excel spreadsheet
- **PDF**: Formatted report

### Export Workflow

1. **Request Export** → Specify type, format, filters
2. **Processing** → Background job processes export
3. **Completion** → File generated, URL provided
4. **Download** → Pre-signed URL (expires after configured time)
5. **Expiry** → File deleted after expiration

### Export Schema

```typescript
interface DataExport {
  id: string;
  exportType: ExportType;
  format: ExportFormat;
  filters?: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedBy: User;
  fileUrl?: string;           // Pre-signed URL
  fileSizeBytes?: number;
  recordCount?: number;
  startedAt?: Date;
  completedAt?: Date;
  expiresAt?: Date;
  errorMessage?: string;
}
```

### Create Export

```graphql
mutation CreateDataExport($input: CreateDataExportInput!) {
  createDataExport(input: $input) {
    id
    status
    exportType
    format
  }
}
```

**Example:**

```graphql
mutation {
  createDataExport(input: {
    exportType: AUDIT_LOGS
    format: CSV
    filters: {
      startDate: "2025-01-01"
      endDate: "2025-11-20"
      action: "admin.user.suspend"
    }
  }) {
    id
    status
  }
}
```

### Limits

- **Max records per export**: 100,000 (configurable)
- **File expiry**: 24 hours (configurable)
- **Rate limit**: 10 exports per user per day

### Security

- Pre-signed URLs with short expiration
- Access logged in audit trail
- PII exports require special permission
- Encryption at rest and in transit

---

## System Configuration

### Overview

Runtime configuration management for system-wide settings.

### Configuration Categories

- **Security**: Login attempts, session timeout, password policies
- **Features**: Feature enablement flags
- **Limits**: Rate limits, export limits, upload limits
- **Integrations**: Third-party service configuration
- **UI**: Display preferences, branding

### Configuration Schema

```typescript
interface SystemConfig {
  configKey: string;               // Unique key
  configValue: any;                // Value (JSONB)
  configType: 'string' | 'number' | 'boolean' | 'json' | 'array';
  category: string;                // Security, features, limits, etc.
  description?: string;
  isSensitive: boolean;            // Mask value in UI
  validationSchema?: Record<string, any>; // JSON Schema for validation
  updatedBy?: User;
  updatedAt: Date;
}
```

### Default Configurations

See migration script for defaults:

- `max_login_attempts`: 5
- `session_timeout_minutes`: 60
- `password_min_length`: 8
- `require_mfa`: false
- `max_export_records`: 100,000
- `export_expiry_hours`: 24
- `audit_retention_days`: 365
- `max_concurrent_sessions`: 3

### Update Configuration

```graphql
mutation UpdateSystemConfig($input: UpdateSystemConfigInput!) {
  updateSystemConfig(input: $input) {
    configKey
    configValue
  }
}
```

**Restrictions:**
- Only PLATFORM_ADMIN can modify configuration
- Sensitive config changes require approval ticket
- All changes logged with reason

### Change History

All config changes tracked in `system_config_history` table.

---

## Alerts

### Overview

Real-time monitoring and alerting for system issues and anomalies.

### Alert Schema

```typescript
interface AdminAlert {
  id: string;
  alertType: AlertType;       // security, performance, error, warning, info
  severity: AlertSeverity;    // critical, high, medium, low, info
  title: string;
  message: string;
  source: string;             // system, monitoring, user_report, automated
  resourceType?: string;
  resourceId?: string;
  status: AlertStatus;        // active, acknowledged, resolved, dismissed
  acknowledgedBy?: User;
  acknowledgedAt?: Date;
  resolvedBy?: User;
  resolvedAt?: Date;
  resolutionNotes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}
```

### Alert Types & Severity

**Types:**
- **SECURITY**: Auth failures, suspicious activity, policy violations
- **PERFORMANCE**: High latency, resource exhaustion, slow queries
- **ERROR**: System errors, service failures, data inconsistencies
- **WARNING**: Approaching limits, deprecated usage
- **INFO**: Informational notifications

**Severity:**
- **CRITICAL**: Immediate action required, service disruption
- **HIGH**: Significant issue, affects users
- **MEDIUM**: Notable issue, monitor closely
- **LOW**: Minor issue, address when convenient
- **INFO**: Informational only

### Operations

#### Acknowledge Alert

```graphql
mutation AcknowledgeAlert($id: ID!) {
  acknowledgeAlert(id: $id) {
    id
    status
    acknowledgedBy {
      fullName
    }
    acknowledgedAt
  }
}
```

#### Resolve Alert

```graphql
mutation ResolveAlert($id: ID!, $resolutionNotes: String!) {
  resolveAlert(id: $id, resolutionNotes: $resolutionNotes) {
    id
    status
    resolvedBy {
      fullName
    }
    resolvedAt
  }
}
```

#### Dismiss Alert

For false positives or non-actionable alerts.

```graphql
mutation DismissAlert($id: ID!) {
  dismissAlert(id: $id) {
    id
    status
  }
}
```

### Integration

Alerts can be created by:
- Monitoring systems (Prometheus, Grafana)
- Application errors
- Security scans
- User reports
- Automated anomaly detection

---

## Security & Compliance

### Authentication

All admin operations require authentication via:
- JWT token with valid signature
- Active user account (not suspended)
- Admin/Moderator role

### Authorization

**OPA Policy Engine** (`/policy/admin-panel.rego`) enforces:

1. **Role-based access control**
2. **Tenant isolation** (except PLATFORM_ADMIN)
3. **Resource ownership** (cannot modify higher-privileged users)
4. **Geo-restrictions** (region-based policies)
5. **Rate limiting** (operation throttling)
6. **MFA requirements** (sensitive operations)

### Audit Compliance

**SOC 2 / GDPR / HIPAA Ready:**

- **Complete audit trail**: All actions logged with actor, timestamp, context
- **Immutable logs**: Audit logs cannot be modified or deleted
- **Data retention policies**: Configurable retention periods
- **Access reports**: Who accessed what, when
- **Impersonation tracking**: Full chain of custody during impersonation
- **Export capabilities**: Compliance exports on demand
- **Right to be forgotten**: User deletion with data purging

### Security Best Practices

1. **Enable MFA** for all admin accounts
2. **Regular password rotation** (enforce via policy)
3. **Audit log review** (weekly minimum)
4. **Principle of least privilege** (minimal required role)
5. **IP allowlisting** for admin access (recommended)
6. **Session timeout** (default 60 minutes, configurable)
7. **Max concurrent sessions** (default 3, configurable)

### Incident Response

In case of suspected compromise:

1. **Review audit logs** for unauthorized access
2. **Check impersonation history** for suspicious sessions
3. **Review alert history** for security alerts
4. **Export audit trail** for forensic analysis
5. **Suspend affected accounts** immediately
6. **Reset passwords** for compromised accounts
7. **Notify security team** via configured channels

---

## API Reference

### GraphQL Schema

See `/graphql/schema/admin-panel.graphql` for complete schema.

**Key Query Types:**
- `adminDashboard`: Dashboard statistics
- `users`: Search users with pagination
- `auditLogs`: Search audit logs
- `moderationQueue`: Moderation queue
- `featureFlags`: Feature flag list
- `adminAlerts`: Active alerts

**Key Mutation Types:**
- `createUser`, `updateUser`, `deleteUser`
- `suspendUser`, `unsuspendUser`
- `resetUserPassword`
- `startImpersonation`, `endImpersonation`
- `reviewModeration`
- `updateFeatureFlag`, `toggleFeatureFlag`
- `createDataExport`
- `acknowledgeAlert`, `resolveAlert`

### Service API

See `/server/src/services/AdminPanelService.ts` for service implementation.

**Key Methods:**
- `searchUsers(filters, limit, offset)`
- `getUserById(userId)`
- `createUser(data, createdBy)`
- `updateUser(userId, data, updatedBy)`
- `suspendUser(userId, suspendedBy, reason)`
- `startImpersonation(adminUserId, targetUserId, reason)`
- `getAuditLogs(filters, limit, offset)`
- `getModerationQueue(filters, limit, offset)`
- `getDashboardStats()`

---

## Troubleshooting

### Common Issues

#### "Authentication required" error

**Cause:** No valid JWT token

**Solution:**
1. Ensure you're logged in
2. Check token expiration
3. Refresh token if expired

#### "Admin privileges required" error

**Cause:** User does not have admin role

**Solution:**
1. Verify your user role: `query { me { role } }`
2. Contact platform admin to grant admin role
3. Check OPA policy for specific operation

#### "Cannot modify platform admin" error

**Cause:** Attempting to modify PLATFORM_ADMIN user without being one

**Solution:**
- Only PLATFORM_ADMIN can modify other PLATFORM_ADMIN users
- Contact platform admin for assistance

#### "Rate limit exceeded" error

**Cause:** Too many operations in short period

**Solution:**
- Wait for rate limit window to reset
- Check OPA policy for specific limits
- Contact platform admin if limit too restrictive

#### Audit logs not appearing

**Cause:** Various

**Solution:**
1. Check database connection
2. Verify `audit_logs` table exists
3. Check service logs for errors
4. Ensure operation was actually a mutation (queries not logged)

#### Export stuck in "processing" status

**Cause:** Background job failed

**Solution:**
1. Check export error message: `query { dataExport(id: "...") { errorMessage } }`
2. Check service logs for background job errors
3. Retry export with smaller dataset
4. Contact platform admin if persistent

---

## Additional Resources

### Related Documentation

- [RBAC Architecture](/docs/RBAC.md)
- [Audit Logging](/docs/AUDIT_LOGGING.md)
- [OPA Policies](/policy/README.md)
- [GraphQL API](/docs/GRAPHQL.md)
- [Security Best Practices](/SECURITY/README.md)

### Support

For issues or questions:

1. Check this documentation
2. Review audit logs for details
3. Check OPA policy decisions
4. Contact platform admin team
5. File issue in issue tracker

### Contributing

When adding new admin features:

1. Update database schema with migration
2. Add GraphQL types and operations
3. Implement service methods
4. Add resolvers with auth checks
5. Update OPA policies
6. Add UI components
7. Update this documentation
8. Add tests
9. Update audit logging

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-20
**Maintainer:** Engineering Team
