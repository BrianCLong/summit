use std::{collections::HashMap, time::Instant};

use actix_web::{http::StatusCode, HttpResponse, ResponseError};
use parking_lot::RwLock;
use rand::Rng;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

use crate::{BloomFilterBits, SimpleBloom};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "mode", rename_all = "snake_case")]
pub enum SessionMode {
    IntersectionOnly,
    Aggregate { epsilon: f64 },
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CreateSessionRequest {
    pub mode: SessionMode,
    #[serde(default = "default_expected_participants")]
    pub expected_participants: usize,
    #[serde(default)]
    pub fault_probability: Option<f64>,
}

fn default_expected_participants() -> usize {
    2
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RegisterRequest {
    pub participant_id: String,
    pub public_key: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RegisterResponse {
    pub session_id: Uuid,
    pub peer_public_key: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CreateSessionResponse {
    pub session_id: Uuid,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BloomFilterPayload {
    pub m: usize,
    pub k: u8,
    pub bits: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AggregateReport {
    pub noisy_sum: f64,
    pub noisy_count: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UploadRequest {
    pub participant_id: String,
    pub hashed_tokens: Vec<String>,
    pub bloom_filter: Option<BloomFilterPayload>,
    #[serde(default)]
    pub aggregates: Option<HashMap<String, AggregateReport>>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AggregateEntry {
    pub hashed_key: String,
    pub total_noisy_sum: f64,
    pub total_noisy_count: f64,
    pub per_participant: HashMap<String, AggregateReport>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum SessionResult {
    Intersection {
        exact: usize,
        estimated: Option<f64>,
    },
    Aggregate(AggregateResult),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AggregateResult {
    pub intersection_size: usize,
    pub entries: Vec<AggregateEntry>,
    pub epsilon: f64,
}

#[derive(Debug, Error)]
pub enum SessionError {
    #[error("session not found")]
    NotFound,
    #[error("participant not registered")]
    ParticipantMissing,
    #[error("peer not available yet")]
    PeerPending,
    #[error("invalid bloom payload: {0}")]
    InvalidBloom(String),
    #[error("session fault injected")]
    FaultInjected,
    #[error("result not ready")]
    ResultNotReady,
    #[error("unexpected participant count")]
    ParticipantCount,
}

impl ResponseError for SessionError {
    fn status_code(&self) -> StatusCode {
        match self {
            SessionError::NotFound => StatusCode::NOT_FOUND,
            SessionError::ParticipantMissing => StatusCode::BAD_REQUEST,
            SessionError::PeerPending => StatusCode::ACCEPTED,
            SessionError::InvalidBloom(_) => StatusCode::BAD_REQUEST,
            SessionError::FaultInjected => StatusCode::INTERNAL_SERVER_ERROR,
            SessionError::ResultNotReady => StatusCode::ACCEPTED,
            SessionError::ParticipantCount => StatusCode::BAD_REQUEST,
        }
    }

    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code()).json(serde_json::json!({
            "error": self.to_string()
        }))
    }
}

#[derive(Clone, Default)]
pub struct SessionStore {
    inner: std::sync::Arc<RwLock<HashMap<Uuid, Session>>>,
}

impl SessionStore {
    pub fn create_session(
        &self,
        mode: SessionMode,
        expected: usize,
        fault_probability: Option<f64>,
    ) -> Uuid {
        let session = Session::new(mode, expected, fault_probability);
        let id = Uuid::new_v4();
        self.inner.write().insert(id, session);
        id
    }

    pub fn handle_create(&self, request: CreateSessionRequest) -> CreateSessionResponse {
        let id = self.create_session(
            request.mode,
            request.expected_participants,
            request.fault_probability,
        );
        CreateSessionResponse { session_id: id }
    }

    pub fn register(
        &self,
        session_id: Uuid,
        request: RegisterRequest,
    ) -> Result<RegisterResponse, SessionError> {
        let mut store = self.inner.write();
        let session = store.get_mut(&session_id).ok_or(SessionError::NotFound)?;
        session.maybe_fault()?;
        let peer_key = session
            .register_participant(request.participant_id.clone(), request.public_key.clone())?;
        Ok(RegisterResponse {
            session_id,
            peer_public_key: peer_key,
        })
    }

    pub fn peer_key(&self, session_id: Uuid, participant_id: &str) -> Result<String, SessionError> {
        let store = self.inner.read();
        let session = store.get(&session_id).ok_or(SessionError::NotFound)?;
        session.peer_key(participant_id)
    }

    pub fn upload(&self, session_id: Uuid, request: UploadRequest) -> Result<(), SessionError> {
        let mut store = self.inner.write();
        let session = store.get_mut(&session_id).ok_or(SessionError::NotFound)?;
        session.maybe_fault()?;
        session.upload(request)?;
        Ok(())
    }

    pub fn result(&self, session_id: Uuid) -> Result<SessionResult, SessionError> {
        let mut store = self.inner.write();
        let session = store.get_mut(&session_id).ok_or(SessionError::NotFound)?;
        session.compute_if_ready()?;
        session.result.clone().ok_or(SessionError::ResultNotReady)
    }
}

#[derive(Clone, Debug)]
struct ParticipantState {
    public_key: String,
    hashed_tokens: Option<Vec<String>>,
    bloom_filter: Option<SimpleBloom>,
    aggregates: Option<HashMap<String, AggregateReport>>,
    uploaded_at: Option<Instant>,
}

impl ParticipantState {
    fn new(public_key: String) -> Self {
        Self {
            public_key,
            hashed_tokens: None,
            bloom_filter: None,
            aggregates: None,
            uploaded_at: None,
        }
    }
}

#[derive(Clone, Debug)]
struct Session {
    mode: SessionMode,
    expected_participants: usize,
    fault_probability: Option<f64>,
    participants: HashMap<String, ParticipantState>,
    result: Option<SessionResult>,
}

impl Session {
    fn new(
        mode: SessionMode,
        expected_participants: usize,
        fault_probability: Option<f64>,
    ) -> Self {
        Self {
            mode,
            expected_participants,
            fault_probability,
            participants: HashMap::new(),
            result: None,
        }
    }

    fn maybe_fault(&self) -> Result<(), SessionError> {
        if let Some(prob) = self.fault_probability {
            if prob > 0.0 {
                let mut rng = rand::thread_rng();
                if rng.gen_bool(prob.clamp(0.0, 1.0)) {
                    return Err(SessionError::FaultInjected);
                }
            }
        }
        Ok(())
    }

    fn register_participant(
        &mut self,
        participant_id: String,
        public_key: String,
    ) -> Result<Option<String>, SessionError> {
        if self.participants.len() >= self.expected_participants
            && !self.participants.contains_key(&participant_id)
        {
            return Err(SessionError::ParticipantCount);
        }
        let peer_key = if let Some(existing) = self.participants.get(&participant_id) {
            Some(existing.public_key.clone())
        } else {
            None
        };
        self.participants
            .entry(participant_id.clone())
            .and_modify(|state| state.public_key = public_key.clone())
            .or_insert_with(|| ParticipantState::new(public_key));
        if self.participants.len() < 2 {
            Ok(None)
        } else {
            let peer = self
                .participants
                .iter()
                .find(|(id, _)| id.as_str() != participant_id)
                .map(|(_, state)| state.public_key.clone());
            Ok(peer.or(peer_key))
        }
    }

    fn peer_key(&self, participant_id: &str) -> Result<String, SessionError> {
        if self.participants.len() < 2 {
            return Err(SessionError::PeerPending);
        }
        let peer = self
            .participants
            .iter()
            .find(|(id, _)| id.as_str() != participant_id)
            .map(|(_, state)| state.public_key.clone());
        peer.ok_or(SessionError::PeerPending)
    }

    fn upload(&mut self, request: UploadRequest) -> Result<(), SessionError> {
        let participant = self
            .participants
            .get_mut(&request.participant_id)
            .ok_or(SessionError::ParticipantMissing)?;
        let bloom = match &request.bloom_filter {
            Some(payload) => Some(
                SimpleBloom::from_payload(&BloomFilterBits {
                    m: payload.m,
                    k: payload.k,
                    bits: payload.bits.clone(),
                })
                .map_err(|e| SessionError::InvalidBloom(e.to_string()))?,
            ),
            None => None,
        };
        participant.hashed_tokens = Some(request.hashed_tokens.clone());
        participant.bloom_filter = bloom;
        participant.aggregates = request.aggregates.clone();
        participant.uploaded_at = Some(Instant::now());
        Ok(())
    }

    fn compute_if_ready(&mut self) -> Result<(), SessionError> {
        if self.result.is_some() {
            return Ok(());
        }
        if self.participants.len() < self.expected_participants {
            return Err(SessionError::ResultNotReady);
        }
        if !self
            .participants
            .values()
            .all(|p| p.hashed_tokens.is_some())
        {
            return Err(SessionError::ResultNotReady);
        }
        let mut iter = self.participants.values();
        let first = iter.next().expect("at least one participant");
        let first_tokens: std::collections::HashSet<String> = first
            .hashed_tokens
            .clone()
            .unwrap_or_default()
            .into_iter()
            .collect();
        let intersection: std::collections::HashSet<String> =
            iter.fold(first_tokens, |acc, participant| {
                let tokens: std::collections::HashSet<String> = participant
                    .hashed_tokens
                    .clone()
                    .unwrap_or_default()
                    .into_iter()
                    .collect();
                acc.intersection(&tokens).cloned().collect()
            });
        let estimated = self.estimate_intersection();
        self.result = Some(match &self.mode {
            SessionMode::IntersectionOnly => SessionResult::Intersection {
                exact: intersection.len(),
                estimated,
            },
            SessionMode::Aggregate { epsilon } => {
                let entries = self.build_aggregate_entries(&intersection);
                SessionResult::Aggregate(AggregateResult {
                    intersection_size: intersection.len(),
                    entries,
                    epsilon: *epsilon,
                })
            }
        });
        Ok(())
    }

    fn estimate_intersection(&self) -> Option<f64> {
        if self.participants.values().any(|p| p.bloom_filter.is_none()) {
            return None;
        }
        let mut iter = self.participants.values();
        let first = iter.next()?.bloom_filter.clone()?;
        let estimate = iter.fold(first, |acc, participant| {
            acc.bitwise_and(participant.bloom_filter.as_ref().expect("bloom available"))
        });
        let est = estimate.estimated_cardinality();
        if est.is_sign_positive() {
            Some(est)
        } else {
            None
        }
    }

    fn build_aggregate_entries(
        &self,
        intersection: &std::collections::HashSet<String>,
    ) -> Vec<AggregateEntry> {
        let mut entries = Vec::new();
        for hashed_key in intersection.iter() {
            let mut total_sum = 0.0;
            let mut total_count = 0.0;
            let mut per_participant = HashMap::new();
            for (participant_id, participant) in &self.participants {
                if let Some(aggregates) = &participant.aggregates {
                    if let Some(report) = aggregates.get(hashed_key) {
                        total_sum += report.noisy_sum;
                        total_count += report.noisy_count;
                        per_participant.insert(participant_id.clone(), report.clone());
                    }
                }
            }
            entries.push(AggregateEntry {
                hashed_key: hashed_key.clone(),
                total_noisy_sum: total_sum,
                total_noisy_count: total_count,
                per_participant,
            });
        }
        entries
    }
}
