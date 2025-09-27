use std::collections::BTreeMap;

use chrono::Duration;
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::token::{compute_default_nonce, TokenClaims};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttenuationRequest {
    pub parent_token: String,
    #[serde(default)]
    pub dataset_ids: Option<Vec<String>>,
    #[serde(default)]
    pub row_scopes: Option<BTreeMap<String, Vec<String>>>,
    #[serde(default)]
    pub purposes: Option<Vec<String>>,
    #[serde(default)]
    pub ttl_seconds: Option<u64>,
    #[serde(default)]
    pub nonce: Option<String>,
}

#[derive(Debug, Error)]
pub enum AttenuationError {
    #[error("ttl must be positive")]
    InvalidTtl,
    #[error("dataset attenuation must be a subset of the parent")]
    DatasetNotSubset,
    #[error("row scope attenuation must be a subset of the parent")]
    RowScopeNotSubset,
    #[error("purpose attenuation must be a subset of the parent")]
    PurposeNotSubset,
}

pub fn attenuate(
    parent: &TokenClaims,
    request: AttenuationRequest,
    now: i64,
    max_ttl: Duration,
) -> Result<TokenClaims, AttenuationError> {
    let mut dataset_ids = request
        .dataset_ids
        .unwrap_or_else(|| parent.dataset_ids.clone());
    dataset_ids.sort();
    dataset_ids.dedup();
    if !dataset_ids.iter().all(|id| parent.dataset_ids.contains(id)) {
        return Err(AttenuationError::DatasetNotSubset);
    }

    let mut row_scopes = request
        .row_scopes
        .unwrap_or_else(|| parent.row_scopes.clone());
    for rows in row_scopes.values_mut() {
        rows.sort();
        rows.dedup();
    }
    for (dataset, rows) in row_scopes.iter() {
        if let Some(parent_rows) = parent.row_scopes.get(dataset) {
            if !rows.iter().all(|row| parent_rows.contains(row)) {
                return Err(AttenuationError::RowScopeNotSubset);
            }
        } else if !parent.dataset_ids.contains(dataset) {
            return Err(AttenuationError::DatasetNotSubset);
        }
    }

    let mut purposes = request.purposes.unwrap_or_else(|| parent.purposes.clone());
    purposes.sort();
    purposes.dedup();
    if !purposes
        .iter()
        .all(|purpose| parent.purposes.contains(purpose))
    {
        return Err(AttenuationError::PurposeNotSubset);
    }

    let ttl_seconds = request
        .ttl_seconds
        .unwrap_or_else(|| (parent.expires_at - now).max(0) as u64);
    if ttl_seconds == 0 {
        return Err(AttenuationError::InvalidTtl);
    }
    let ttl_seconds = ttl_seconds.min(max_ttl.num_seconds() as u64);
    let expires_at_candidate = now + ttl_seconds as i64;
    let expires_at = expires_at_candidate.min(parent.expires_at);
    if expires_at <= now {
        return Err(AttenuationError::InvalidTtl);
    }

    let nonce = request.nonce.unwrap_or_else(|| {
        compute_default_nonce(
            &parent.audience,
            &dataset_ids,
            &row_scopes,
            &purposes,
            expires_at,
        )
    });

    Ok(TokenClaims::new(
        dataset_ids,
        row_scopes,
        purposes,
        parent.audience.clone(),
        now,
        expires_at,
        Some(parent.jti.clone()),
        nonce,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::BTreeMap;

    fn parent_claims() -> TokenClaims {
        TokenClaims::new(
            vec!["dataset-a".into(), "dataset-b".into()],
            BTreeMap::from([("dataset-a".into(), vec!["row-1".into(), "row-2".into()])]),
            vec!["analytics".into(), "reporting".into()],
            "aud".into(),
            1_700_000_000,
            1_700_000_600,
            None,
            "nonce".into(),
        )
    }

    #[test]
    fn attenuation_restricts_scope() {
        let parent = parent_claims();
        let request = AttenuationRequest {
            parent_token: String::new(),
            dataset_ids: Some(vec!["dataset-a".into()]),
            row_scopes: Some(BTreeMap::from([("dataset-a".into(), vec!["row-1".into()])])),
            purposes: Some(vec!["analytics".into()]),
            ttl_seconds: Some(60),
            nonce: None,
        };
        let attenuated =
            attenuate(&parent, request, 1_700_000_100, Duration::seconds(600)).unwrap();
        assert_eq!(attenuated.dataset_ids, vec!["dataset-a"]);
        assert_eq!(
            attenuated.row_scopes.get("dataset-a").unwrap(),
            &vec!["row-1".to_string()]
        );
        assert_eq!(attenuated.purposes, vec!["analytics"]);
        assert!(attenuated.expires_at <= parent.expires_at);
    }

    #[test]
    fn attenuation_rejects_privilege_escalation() {
        let parent = parent_claims();
        let request = AttenuationRequest {
            parent_token: String::new(),
            dataset_ids: Some(vec!["dataset-c".into()]),
            row_scopes: None,
            purposes: None,
            ttl_seconds: Some(60),
            nonce: None,
        };
        assert!(matches!(
            attenuate(&parent, request, 1_700_000_100, Duration::seconds(600)),
            Err(AttenuationError::DatasetNotSubset)
        ));
    }
}
