use std::cmp::Ordering;
use std::collections::HashMap;
use std::sync::Arc;

use crate::backend::{SearchCandidate, VectorBackend};
use crate::error::{PgvrError, PgvrResult};
use crate::policy::Policy;
use crate::types::{SearchMode, SearchQuery, SearchResponse, SearchResult, VectorRecord};

#[derive(Clone)]
pub struct Shard {
    pub index_id: String,
    pub backend: Arc<dyn VectorBackend>,
    pub policy: Policy,
}

impl Shard {
    pub fn new(index_id: String, backend: Arc<dyn VectorBackend>, policy: Policy) -> Self {
        Self {
            index_id,
            backend,
            policy,
        }
    }
}

pub struct PgvrRouter {
    shards: HashMap<String, Vec<Shard>>,
}

impl PgvrRouter {
    pub fn new() -> Self {
        Self {
            shards: HashMap::new(),
        }
    }

    pub fn register_shard(&mut self, tenant_id: impl Into<String>, shard: Shard) {
        self.shards.entry(tenant_id.into()).or_default().push(shard);
    }

    pub fn search(&self, query: SearchQuery) -> PgvrResult<SearchResponse> {
        self.execute(query, SearchMode::Live)
    }

    pub fn dry_run(&self, query: SearchQuery) -> PgvrResult<SearchResponse> {
        self.execute(query, SearchMode::DryRun)
    }

    fn execute(&self, query: SearchQuery, mode: SearchMode) -> PgvrResult<SearchResponse> {
        let shards = self
            .shards
            .get(&query.tenant_id)
            .ok_or_else(|| PgvrError::UnknownTenant(query.tenant_id.clone()))?;

        let mut collected: Vec<SearchResult> = Vec::new();
        for shard in shards {
            let candidates = shard.backend.search(&query.vector, query.top_k);
            for candidate in candidates {
                if !self.candidate_allowed(&candidate, shard, &query) {
                    continue;
                }

                collected.push(SearchResult {
                    vector_id: candidate.record.id.clone(),
                    score: candidate.score,
                    index_id: shard.index_id.clone(),
                    policy_hash: shard.policy.policy_hash.clone(),
                });
            }
        }

        collected.sort_by(|a, b| compare_results(a, b));
        collected.truncate(query.top_k.min(collected.len()));

        Ok(SearchResponse {
            mode,
            results: collected,
        })
    }

    fn candidate_allowed(
        &self,
        candidate: &SearchCandidate,
        shard: &Shard,
        query: &SearchQuery,
    ) -> bool {
        let record: &VectorRecord = &candidate.record;

        if !record.is_accessible(query.jurisdiction.as_deref(), query.purpose.as_deref()) {
            return false;
        }

        shard.policy.allows(
            record,
            query.requested_fields(),
            query.jurisdiction.as_deref(),
            query.purpose.as_deref(),
        )
    }
}

fn compare_results(a: &SearchResult, b: &SearchResult) -> Ordering {
    b.score
        .partial_cmp(&a.score)
        .unwrap_or(Ordering::Equal)
        .then_with(|| a.vector_id.cmp(&b.vector_id))
}
