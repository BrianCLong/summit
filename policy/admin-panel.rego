package admin.panel

import future.keywords.if
import future.keywords.in

# ============================================================================
# Admin Panel RBAC Policy
# ============================================================================
#
# This policy governs access to admin panel operations including:
# - User management
# - Audit log viewing
# - Content moderation
# - Feature flag management
# - System configuration
# - Data exports
#
# Roles:
# - PLATFORM_ADMIN: Full access to all admin operations across all tenants
# - ADMIN: Full access to admin operations within their tenant
# - MODERATOR: Access to content moderation only
# - ANALYST/VIEWER: No admin access
#
# ============================================================================

# Default deny all
default allow = false

# Input contract:
# {
#   "actor": {
#     "id": "user-id",
#     "email": "user@example.com",
#     "role": "ADMIN|PLATFORM_ADMIN|MODERATOR|ANALYST|VIEWER",
#     "tenantId": "tenant-123"
#   },
#   "operation": {
#     "type": "query|mutation",
#     "name": "users|createUser|suspendUser|...",
#     "resource": "user|audit|moderation|flag|config|export"
#   },
#   "context": {
#     "ip": "192.168.1.1",
#     "userAgent": "...",
#     "tenantId": "tenant-123",
#     "targetUserId": "target-user-id" (for impersonation, user operations)
#   }
# }

# ============================================================================
# ROLE DEFINITIONS
# ============================================================================

is_platform_admin if {
  input.actor.role == "PLATFORM_ADMIN"
}

is_admin if {
  input.actor.role == "ADMIN"
}

is_moderator if {
  input.actor.role == "MODERATOR"
}

is_analyst if {
  input.actor.role == "ANALYST"
}

is_viewer if {
  input.actor.role == "VIEWER"
}

# Helper: Check if user has admin privileges
has_admin_role if {
  is_platform_admin
}

has_admin_role if {
  is_admin
}

# Helper: Check if user has moderator privileges
has_moderator_role if {
  has_admin_role
}

has_moderator_role if {
  is_moderator
}

# ============================================================================
# DASHBOARD ACCESS
# ============================================================================

# Platform admins can access dashboard
allow if {
  is_platform_admin
  input.operation.name == "adminDashboard"
}

# Admins can access dashboard for their tenant
allow if {
  is_admin
  input.operation.name == "adminDashboard"
  input.actor.tenantId == input.context.tenantId
}

# ============================================================================
# USER MANAGEMENT
# ============================================================================

# Platform admins can manage all users across all tenants
allow if {
  is_platform_admin
  input.operation.resource == "user"
}

# Admins can manage users in their tenant
allow if {
  is_admin
  input.operation.resource == "user"
  input.actor.tenantId == input.context.tenantId
}

# Deny if admin tries to escalate privileges above their own role
deny[msg] if {
  is_admin
  not is_platform_admin
  input.operation.name in ["createUser", "updateUser", "bulkUpdateUserRole"]
  input.operation.variables.role == "PLATFORM_ADMIN"
  msg := "cannot_assign_platform_admin_role"
}

# Deny if admin tries to modify platform admin users
deny[msg] if {
  is_admin
  not is_platform_admin
  input.operation.name in ["updateUser", "deleteUser", "suspendUser"]
  input.context.targetUserRole == "PLATFORM_ADMIN"
  msg := "cannot_modify_platform_admin"
}

# Deny self-suspension
deny[msg] if {
  input.operation.name in ["suspendUser", "deleteUser"]
  input.actor.id == input.context.targetUserId
  msg := "cannot_suspend_or_delete_self"
}

# ============================================================================
# USER IMPERSONATION
# ============================================================================

# Only admins can impersonate users
allow if {
  has_admin_role
  input.operation.name in ["startImpersonation", "endImpersonation"]
}

# Deny impersonation of admins (unless platform admin)
deny[msg] if {
  is_admin
  not is_platform_admin
  input.operation.name == "startImpersonation"
  input.context.targetUserRole in ["ADMIN", "PLATFORM_ADMIN"]
  msg := "cannot_impersonate_admin"
}

# Require reason for impersonation
deny[msg] if {
  input.operation.name == "startImpersonation"
  not input.operation.variables.reason
  msg := "impersonation_reason_required"
}

# Deny impersonation from untrusted IPs (example policy)
deny[msg] if {
  input.operation.name == "startImpersonation"
  not is_trusted_ip(input.context.ip)
  msg := "impersonation_from_untrusted_ip"
}

# Helper: Check if IP is trusted (placeholder - customize for your environment)
is_trusted_ip(ip) if {
  # Add your trusted IP ranges here
  # For now, allow all (customize in production)
  true
}

# ============================================================================
# AUDIT LOG ACCESS
# ============================================================================

# Platform admins can view all audit logs
allow if {
  is_platform_admin
  input.operation.resource == "audit"
  input.operation.type == "query"
}

# Admins can view audit logs for their tenant
allow if {
  is_admin
  input.operation.resource == "audit"
  input.operation.type == "query"
  input.actor.tenantId == input.context.tenantId
}

# Deny audit log deletion/modification
deny[msg] if {
  input.operation.resource == "audit"
  input.operation.type == "mutation"
  input.operation.name in ["deleteAuditLog", "updateAuditLog"]
  msg := "audit_logs_immutable"
}

# ============================================================================
# CONTENT MODERATION
# ============================================================================

# Moderators can view and review moderation queue
allow if {
  has_moderator_role
  input.operation.resource == "moderation"
  input.operation.name in ["moderationQueue", "moderationItem", "reviewModeration", "assignModeration"]
}

# Escalation requires admin role
allow if {
  has_admin_role
  input.operation.name == "escalateModeration"
}

# ============================================================================
# FEATURE FLAGS
# ============================================================================

# Platform admins can manage all feature flags
allow if {
  is_platform_admin
  input.operation.resource == "feature_flag"
}

# Admins can manage feature flags for their tenant
allow if {
  is_admin
  input.operation.resource == "feature_flag"
  input.actor.tenantId == input.context.tenantId
}

# Require reason for critical flag changes
deny[msg] if {
  input.operation.name in ["updateFeatureFlag", "toggleFeatureFlag"]
  input.operation.variables.tags[_] == "critical"
  not input.operation.variables.reason
  msg := "reason_required_for_critical_flag"
}

# Deny disabling security features without platform admin role
deny[msg] if {
  is_admin
  not is_platform_admin
  input.operation.name in ["updateFeatureFlag", "toggleFeatureFlag"]
  input.operation.variables.tags[_] == "security"
  input.operation.variables.enabled == false
  msg := "platform_admin_required_to_disable_security_features"
}

# ============================================================================
# SYSTEM CONFIGURATION
# ============================================================================

# Only platform admins can modify system configuration
allow if {
  is_platform_admin
  input.operation.resource == "system_config"
}

# Admins can view (but not modify) configuration
allow if {
  is_admin
  input.operation.resource == "system_config"
  input.operation.type == "query"
}

# Deny modification of sensitive config without approval
deny[msg] if {
  input.operation.name == "updateSystemConfig"
  input.operation.variables.isSensitive == true
  not input.operation.variables.approvalTicket
  msg := "approval_ticket_required_for_sensitive_config"
}

# ============================================================================
# DATA EXPORTS
# ============================================================================

# Admins can create data exports
allow if {
  has_admin_role
  input.operation.resource == "data_export"
  input.operation.name in ["createDataExport", "dataExports", "dataExport"]
}

# Deny exports larger than configured limit
deny[msg] if {
  input.operation.name == "createDataExport"
  input.operation.variables.recordCount > data.config.max_export_records
  msg := "export_exceeds_max_records"
}

# Deny exporting PII without proper permissions
deny[msg] if {
  input.operation.name == "createDataExport"
  input.operation.variables.exportType in ["users", "audit_logs"]
  not has_pii_export_permission
  msg := "pii_export_permission_required"
}

has_pii_export_permission if {
  is_platform_admin
}

has_pii_export_permission if {
  is_admin
  input.actor.permissions[_] == "pii:export"
}

# ============================================================================
# ALERTS
# ============================================================================

# Admins can view and manage alerts
allow if {
  has_admin_role
  input.operation.resource == "alert"
}

# ============================================================================
# BULK OPERATIONS
# ============================================================================

# Allow bulk operations for admins
allow if {
  has_admin_role
  input.operation.name in ["bulkSuspendUsers", "bulkUpdateUserRole", "bulkDeleteUsers"]
  input.actor.tenantId == input.context.tenantId
}

# Limit bulk operation size
deny[msg] if {
  input.operation.name in ["bulkSuspendUsers", "bulkUpdateUserRole", "bulkDeleteUsers"]
  count(input.operation.variables.userIds) > 100
  msg := "bulk_operation_exceeds_max_size"
}

# Require reason for bulk operations
deny[msg] if {
  input.operation.name in ["bulkSuspendUsers", "bulkDeleteUsers"]
  not input.operation.variables.reason
  msg := "reason_required_for_bulk_operations"
}

# ============================================================================
# RATE LIMITING
# ============================================================================

# Deny if rate limit exceeded (integration with rate limiter)
deny[msg] if {
  input.operation.resource == "user"
  input.operation.type == "mutation"
  exceeds_rate_limit(input.actor.id, "admin.user.mutations", 50, 300) # 50 per 5 minutes
  msg := "rate_limit_exceeded"
}

deny[msg] if {
  input.operation.name == "startImpersonation"
  exceeds_rate_limit(input.actor.id, "admin.impersonation", 10, 3600) # 10 per hour
  msg := "impersonation_rate_limit_exceeded"
}

# Helper: Check rate limit (placeholder - integrate with actual rate limiter)
exceeds_rate_limit(actor_id, operation, limit, window_seconds) if {
  # This would integrate with your rate limiting system
  # For now, always allow (implement in production)
  false
}

# ============================================================================
# COMPLIANCE & AUDITING
# ============================================================================

# All admin operations must be audited
audit_required if {
  input.operation.resource in ["user", "moderation", "feature_flag", "system_config"]
  input.operation.type == "mutation"
}

# Compliance: Require MFA for sensitive operations
deny[msg] if {
  input.operation.name in [
    "deleteUser",
    "bulkDeleteUsers",
    "updateSystemConfig",
    "startImpersonation"
  ]
  not input.actor.mfaVerified
  msg := "mfa_required_for_sensitive_operations"
}

# ============================================================================
# GEO-RESTRICTIONS
# ============================================================================

# Deny operations from restricted regions (example)
deny[msg] if {
  input.operation.name in ["createDataExport", "startImpersonation"]
  input.context.region in data.restricted_regions
  msg := "operation_not_allowed_from_region"
}

# ============================================================================
# DECISION
# ============================================================================

# Collect all deny reasons
violations[msg] {
  deny[msg]
}

# Final decision
decision = {
  "allow": allow,
  "deny": violations,
  "audit_required": audit_required,
  "requires_mfa": requires_mfa,
}

requires_mfa if {
  input.operation.name in [
    "deleteUser",
    "bulkDeleteUsers",
    "updateSystemConfig",
    "startImpersonation"
  ]
}
