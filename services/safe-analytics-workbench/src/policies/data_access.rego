# Safe Analytics Workbench - Data Access Policies
#
# OPA Rego policies for data access control within analytics workspaces.

package analytics.data_access

import future.keywords.in
import future.keywords.if
import future.keywords.contains

# ============================================================================
# Default Deny
# ============================================================================

default allow := false

# ============================================================================
# Dataset Tier Access Policies
# ============================================================================

# Synthetic data is open to all authenticated users
allow if {
    input.action == "QUERY"
    input.dataset.tier == "SYNTHETIC"
    input.user.authenticated == true
}

# Anonymized data is available to all analysts and above
allow if {
    input.action == "QUERY"
    input.dataset.tier == "ANONYMIZED"
    input.user.roles[_] in ["analyst", "data_scientist", "engineer", "auditor"]
}

# Curated data requires same business unit or explicit grant
allow if {
    input.action == "QUERY"
    input.dataset.tier == "CURATED"
    same_business_unit
}

allow if {
    input.action == "QUERY"
    input.dataset.tier == "CURATED"
    has_dataset_grant
}

# Raw data requires explicit approval
allow if {
    input.action == "QUERY"
    input.dataset.tier == "RAW"
    has_raw_data_approval
}

# ============================================================================
# Business Unit Access
# ============================================================================

same_business_unit if {
    input.user.business_unit == input.dataset.owner_business_unit
}

same_business_unit if {
    input.user.roles[_] == "engineer"  # Engineers have cross-BU access
}

# ============================================================================
# Approval-Based Access
# ============================================================================

has_dataset_grant if {
    grant := input.user.dataset_grants[_]
    grant.dataset_id == input.dataset.id
    grant.access_level in ["READ", "READ_WRITE"]
    time.now_ns() < grant.expires_at_ns
}

has_raw_data_approval if {
    approval := input.user.approvals[_]
    approval.dataset_id == input.dataset.id
    approval.type == "RAW_DATA_ACCESS"
    approval.status == "APPROVED"
    time.now_ns() < approval.expires_at_ns
}

# ============================================================================
# Column-Level Access Policies
# ============================================================================

# Check if user can access specific columns
columns_allowed if {
    input.action == "QUERY"
    not contains_blocked_columns
}

contains_blocked_columns if {
    col := input.query.columns[_]
    col_def := input.dataset.schema.columns[col]
    col_def.classification == "RESTRICTED"
    not has_column_access(col)
}

contains_blocked_columns if {
    col := input.query.columns[_]
    col_def := input.dataset.schema.columns[col]
    col_def.classification == "PII"
    input.user.roles[_] == "analyst"
    not has_pii_approval
}

has_column_access(column) if {
    grant := input.user.column_grants[_]
    grant.dataset_id == input.dataset.id
    column in grant.columns
    time.now_ns() < grant.expires_at_ns
}

has_pii_approval if {
    approval := input.user.approvals[_]
    approval.type == "PII_ACCESS"
    approval.status == "APPROVED"
    time.now_ns() < approval.expires_at_ns
}

# ============================================================================
# Row-Level Access Policies
# ============================================================================

# Apply row filter if defined for user's access
row_filter := filter if {
    grant := input.user.dataset_grants[_]
    grant.dataset_id == input.dataset.id
    filter := grant.row_filter
}

row_filter := "" if {
    not has_row_restriction
}

has_row_restriction if {
    grant := input.user.dataset_grants[_]
    grant.dataset_id == input.dataset.id
    grant.row_filter != ""
}

# ============================================================================
# Query Complexity Limits
# ============================================================================

query_within_limits if {
    input.query.estimated_rows <= max_rows_per_query[input.user.roles[0]]
    input.query.estimated_bytes <= max_bytes_per_query[input.user.roles[0]]
}

max_rows_per_query := {
    "analyst": 1000000,
    "data_scientist": 10000000,
    "engineer": 100000000,
    "auditor": 1000000,
}

max_bytes_per_query := {
    "analyst": 1073741824,       # 1 GB
    "data_scientist": 10737418240,  # 10 GB
    "engineer": 107374182400,    # 100 GB
    "auditor": 1073741824,       # 1 GB
}

# ============================================================================
# Time-Based Access
# ============================================================================

# Some datasets may have time-based access restrictions
time_access_allowed if {
    not input.dataset.time_restrictions
}

time_access_allowed if {
    input.dataset.time_restrictions
    current_hour := time.clock([time.now_ns(), "UTC"])[0]
    current_hour >= input.dataset.time_restrictions.start_hour
    current_hour <= input.dataset.time_restrictions.end_hour
}

# ============================================================================
# Sensitive Query Detection
# ============================================================================

is_sensitive_query if {
    input.query.joins_count > 5
}

is_sensitive_query if {
    input.query.accesses_pii == true
}

is_sensitive_query if {
    input.query.cross_tenant == true
}

is_sensitive_query if {
    input.query.estimated_rows > 10000000
}

requires_approval if {
    is_sensitive_query
    input.user.roles[_] == "analyst"
}

# ============================================================================
# Column Masking Requirements
# ============================================================================

masking_required[column] := mask_type if {
    col_def := input.dataset.schema.columns[column]
    col_def.classification == "PII"
    input.user.roles[_] == "analyst"
    mask_type := "MASK"
}

masking_required[column] := mask_type if {
    col_def := input.dataset.schema.columns[column]
    col_def.pii_type in ["SSN", "FINANCIAL"]
    mask_type := "REDACT"
}

masking_required[column] := mask_type if {
    col_def := input.dataset.schema.columns[column]
    col_def.classification == "SENSITIVE"
    not has_sensitive_access
    mask_type := "HASH"
}

has_sensitive_access if {
    input.user.roles[_] in ["data_scientist", "engineer"]
}

# ============================================================================
# Audit Requirements
# ============================================================================

requires_reason_for_access if {
    input.dataset.tier in ["RAW", "CURATED"]
}

requires_reason_for_access if {
    is_sensitive_query
}

# ============================================================================
# Denial Reasons
# ============================================================================

deny_reasons contains "Dataset tier requires approval" if {
    input.action == "QUERY"
    input.dataset.tier == "RAW"
    not has_raw_data_approval
}

deny_reasons contains "Cross-business unit access not permitted" if {
    input.action == "QUERY"
    input.dataset.tier == "CURATED"
    not same_business_unit
    not has_dataset_grant
}

deny_reasons contains "Query exceeds row limit for your role" if {
    input.action == "QUERY"
    input.query.estimated_rows > max_rows_per_query[input.user.roles[0]]
}

deny_reasons contains "Query exceeds byte limit for your role" if {
    input.action == "QUERY"
    input.query.estimated_bytes > max_bytes_per_query[input.user.roles[0]]
}

deny_reasons contains "Access restricted to specific time windows" if {
    input.action == "QUERY"
    not time_access_allowed
}

deny_reasons contains "Restricted columns in query require approval" if {
    input.action == "QUERY"
    contains_blocked_columns
}
