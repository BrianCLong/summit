use crate::audit::{AuditExportError, export_audit_csv, export_audit_json};
use crate::crypto::{CryptoError, parse_public_key, verify_signed_grant};
use crate::models::{
    AuditAction, AuditEvent, BudgetAccountSummary, ProjectId, RegisterKeyRequest, SignedGrant,
    SpendRequest, TenantId,
};
use parking_lot::RwLock;
use serde_json::json;
use std::collections::HashMap;
use thiserror::Error;

#[derive(Default)]
pub struct DpBank {
    inner: RwLock<Ledger>,
}

#[derive(Default)]
struct Ledger {
    accounts: HashMap<TenantId, HashMap<ProjectId, BudgetAccount>>,
    keys: HashMap<TenantId, HashMap<String, ed25519_dalek::PublicKey>>,
    audit: Vec<AuditEvent>,
}

#[derive(Default, Clone, Copy)]
struct BudgetAccount {
    allocated_epsilon: f64,
    allocated_delta: f64,
    spent_epsilon: f64,
    spent_delta: f64,
}

impl BudgetAccount {
    fn summary(&self, tenant_id: TenantId, project_id: ProjectId) -> BudgetAccountSummary {
        BudgetAccountSummary {
            tenant_id,
            project_id,
            allocated_epsilon: self.allocated_epsilon,
            allocated_delta: self.allocated_delta,
            spent_epsilon: self.spent_epsilon,
            spent_delta: self.spent_delta,
            remaining_epsilon: (self.allocated_epsilon - self.spent_epsilon).max(0.0),
            remaining_delta: (self.allocated_delta - self.spent_delta).max(0.0),
        }
    }
}

#[derive(Debug, Error)]
pub enum DpBankError {
    #[error("tenant `{tenant}` does not have a registered key `{key_id}`")]
    UnknownKey { tenant: String, key_id: String },
    #[error("cannot process negative grant values")]
    NegativeGrant,
    #[error("cannot process negative spend values")]
    NegativeSpend,
    #[error(
        "epsilon spend of {requested:.4} exceeds remaining budget {available:.4} for {tenant}/{project}"
    )]
    InsufficientEpsilon {
        tenant: String,
        project: String,
        requested: f64,
        available: f64,
    },
    #[error(
        "delta spend of {requested:.6} exceeds remaining budget {available:.6} for {tenant}/{project}"
    )]
    InsufficientDelta {
        tenant: String,
        project: String,
        requested: f64,
        available: f64,
    },
    #[error(transparent)]
    Crypto(#[from] CryptoError),
}

impl DpBank {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn register_key(
        &self,
        tenant: &str,
        request: RegisterKeyRequest,
    ) -> Result<(), DpBankError> {
        let public_key = parse_public_key(&request.public_key)?;
        let mut guard = self.inner.write();
        let tenant_keys = guard.keys.entry(tenant.to_string()).or_default();
        tenant_keys.insert(request.key_id.clone(), public_key);
        guard.audit.push(AuditEvent::new(
            tenant.to_string(),
            None,
            AuditAction::RegisterKey,
            json!({
                "key_id": request.key_id,
            }),
        ));
        Ok(())
    }

    pub fn apply_grant(&self, grant: SignedGrant) -> Result<BudgetAccountSummary, DpBankError> {
        if grant.payload.epsilon < 0.0 || grant.payload.delta < 0.0 {
            return Err(DpBankError::NegativeGrant);
        }

        let key = {
            let guard = self.inner.read();
            guard
                .keys
                .get(&grant.payload.tenant_id)
                .and_then(|keys| keys.get(&grant.payload.key_id))
                .copied()
        };

        let key = key.ok_or(DpBankError::UnknownKey {
            tenant: grant.payload.tenant_id.clone(),
            key_id: grant.payload.key_id.clone(),
        })?;

        verify_signed_grant(&grant, &key)?;

        let mut guard = self.inner.write();
        let accounts = guard
            .accounts
            .entry(grant.payload.tenant_id.clone())
            .or_default();
        let account = accounts
            .entry(grant.payload.project_id.clone())
            .or_default();
        account.allocated_epsilon += grant.payload.epsilon;
        account.allocated_delta += grant.payload.delta;
        let summary = account.summary(
            grant.payload.tenant_id.clone(),
            grant.payload.project_id.clone(),
        );
        guard.audit.push(AuditEvent::new(
            grant.payload.tenant_id.clone(),
            Some(grant.payload.project_id.clone()),
            AuditAction::GrantApplied,
            json!({
                "key_id": grant.payload.key_id,
                "epsilon": grant.payload.epsilon,
                "delta": grant.payload.delta,
                "nonce": grant.payload.nonce,
            }),
        ));
        Ok(summary)
    }

    pub fn record_spend(
        &self,
        tenant: &str,
        project: &str,
        spend: SpendRequest,
    ) -> Result<BudgetAccountSummary, DpBankError> {
        if spend.epsilon < 0.0 || spend.delta < 0.0 {
            return Err(DpBankError::NegativeSpend);
        }

        let mut guard = self.inner.write();
        let accounts = guard.accounts.entry(tenant.to_string()).or_default();
        let account = accounts.entry(project.to_string()).or_default();
        let remaining_epsilon = account.allocated_epsilon - account.spent_epsilon;
        if spend.epsilon > remaining_epsilon + f64::EPSILON {
            return Err(DpBankError::InsufficientEpsilon {
                tenant: tenant.to_string(),
                project: project.to_string(),
                requested: spend.epsilon,
                available: remaining_epsilon.max(0.0),
            });
        }
        let remaining_delta = account.allocated_delta - account.spent_delta;
        if spend.delta > remaining_delta + f64::EPSILON {
            return Err(DpBankError::InsufficientDelta {
                tenant: tenant.to_string(),
                project: project.to_string(),
                requested: spend.delta,
                available: remaining_delta.max(0.0),
            });
        }

        account.spent_epsilon += spend.epsilon;
        account.spent_delta += spend.delta;
        let summary = account.summary(tenant.to_string(), project.to_string());
        guard.audit.push(AuditEvent::new(
            tenant.to_string(),
            Some(project.to_string()),
            AuditAction::SpendRecorded,
            json!({
                "epsilon": spend.epsilon,
                "delta": spend.delta,
                "query_id": spend.query_id,
                "note": spend.note,
            }),
        ));
        Ok(summary)
    }

    pub fn get_account_summary(&self, tenant: &str, project: &str) -> Option<BudgetAccountSummary> {
        let guard = self.inner.read();
        guard.accounts.get(tenant).and_then(|projects| {
            projects
                .get(project)
                .map(|account| account.summary(tenant.to_string(), project.to_string()))
        })
    }

    pub fn audit_events(&self) -> Vec<AuditEvent> {
        let guard = self.inner.read();
        guard.audit.clone()
    }

    pub fn export_audit_csv(&self) -> Result<String, AuditExportError> {
        let events = self.audit_events();
        export_audit_csv(&events)
    }

    pub fn export_audit_json(&self) -> Result<String, AuditExportError> {
        let events = self.audit_events();
        export_audit_json(&events)
    }
}
