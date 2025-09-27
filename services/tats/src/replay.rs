use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use parking_lot::Mutex;

pub trait ReplayCache: Send + Sync {
    /// Returns true if the token is newly recorded, false if it was seen before.
    fn check_and_store(&self, jti: &str, expires_at: i64) -> bool;
}

#[derive(Clone, Default)]
pub struct MemoryReplayCache {
    inner: Arc<Mutex<HashMap<String, i64>>>,
}

impl MemoryReplayCache {
    pub fn new() -> Self {
        Self::default()
    }

    fn purge_expired(entries: &mut HashMap<String, i64>, now: i64) {
        entries.retain(|_, &mut exp| exp > now);
    }

    fn now_seconds() -> i64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or(Duration::ZERO)
            .as_secs() as i64
    }
}

impl ReplayCache for MemoryReplayCache {
    fn check_and_store(&self, jti: &str, expires_at: i64) -> bool {
        let now = Self::now_seconds();
        let mut guard = self.inner.lock();
        Self::purge_expired(&mut guard, now);
        match guard.get(jti) {
            Some(_) => false,
            None => {
                guard.insert(jti.to_string(), expires_at);
                true
            }
        }
    }
}

pub struct NoopReplayCache;

impl ReplayCache for NoopReplayCache {
    fn check_and_store(&self, _jti: &str, _expires_at: i64) -> bool {
        true
    }
}
