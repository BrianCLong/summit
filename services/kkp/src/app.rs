use std::{env, sync::Arc, time::Duration as StdDuration};

use anyhow::Context;
use axum::{routing::get, Router};
use parking_lot::RwLock;
use time::Duration;

use crate::{
    api::{decrypt_envelope, encrypt_envelope, get_jwks, issue_token, rotate_keys},
    keyring::SigningKeyRing,
    kms::KmsRegistry,
    policy::PolicyEngine,
};

#[derive(Clone)]
pub struct AppState {
    pub kms: Arc<KmsRegistry>,
    pub keyring: Arc<RwLock<SigningKeyRing>>,
    pub policy: Arc<PolicyEngine>,
    pub default_token_ttl: Duration,
    pub rotation_interval: Duration,
}

impl AppState {
    pub fn spawn_rotation_task(&self) {
        let ring = self.keyring.clone();
        let interval = self.rotation_interval;
        tokio::spawn(async move {
            let secs = interval.whole_seconds().max(1) as u64;
            let mut ticker = tokio::time::interval(StdDuration::from_secs(secs));
            loop {
                ticker.tick().await;
                let mut guard = ring.write();
                guard.prune_expired();
                guard.rotate();
            }
        });
    }
}

pub struct AppConfig {
    pub listen_addr: String,
    pub policy_path: Option<String>,
    pub default_token_ttl: Duration,
    pub key_ttl: Duration,
    pub rotation_interval: Duration,
    pub max_active_keys: usize,
}

impl AppConfig {
    pub fn from_env() -> anyhow::Result<Self> {
        let listen_addr =
            env::var("KKP_LISTEN_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".to_string());
        let policy_path = env::var("KKP_POLICY_PATH").ok();
        let default_token_ttl = env::var("KKP_TOKEN_TTL_SECS")
            .ok()
            .and_then(|s| s.parse::<i64>().ok())
            .map(|secs| Duration::seconds(secs.max(1)))
            .unwrap_or_else(|| Duration::seconds(300));
        let key_ttl = env::var("KKP_KEY_TTL_SECS")
            .ok()
            .and_then(|s| s.parse::<i64>().ok())
            .map(|secs| Duration::seconds(secs.max(60)))
            .unwrap_or_else(|| Duration::seconds(1800));
        let rotation_interval = env::var("KKP_KEY_ROTATION_SECS")
            .ok()
            .and_then(|s| s.parse::<i64>().ok())
            .map(|secs| Duration::seconds(secs.max(60)))
            .unwrap_or_else(|| Duration::seconds(900));
        let max_active_keys = env::var("KKP_MAX_ACTIVE_KEYS")
            .ok()
            .and_then(|s| s.parse::<usize>().ok())
            .filter(|value| *value > 0)
            .unwrap_or(5);
        Ok(Self {
            listen_addr,
            policy_path,
            default_token_ttl,
            key_ttl,
            rotation_interval,
            max_active_keys,
        })
    }

    pub async fn build_state(&self) -> anyhow::Result<AppState> {
        let policy = if let Some(path) = &self.policy_path {
            tokio::fs::read_to_string(path)
                .await
                .with_context(|| format!("failed to load policy from {path}"))?
        } else {
            include_str!("../policy/kkp.rego").to_string()
        };

        let kms = Arc::new(KmsRegistry::default());
        let ring = Arc::new(RwLock::new(SigningKeyRing::new(
            Some(self.max_active_keys),
            self.key_ttl,
        )));
        let policy_engine = Arc::new(PolicyEngine::new(policy, None));
        let state = AppState {
            kms,
            keyring: ring,
            policy: policy_engine,
            default_token_ttl: self.default_token_ttl,
            rotation_interval: self.rotation_interval,
        };
        state.spawn_rotation_task();
        Ok(state)
    }
}

pub fn build_router(state: AppState) -> Router {
    Router::new()
        .route("/token", axum::routing::post(issue_token))
        .route("/envelope/encrypt", axum::routing::post(encrypt_envelope))
        .route("/envelope/decrypt", axum::routing::post(decrypt_envelope))
        .route("/keys/jwks", get(get_jwks))
        .route("/keys/rotate", axum::routing::post(rotate_keys))
        .with_state(state)
}
