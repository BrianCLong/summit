use agql_core::{Attestation, AttestationGraph, ConsistencyIssue, DagError, ProofPath};
use anyhow::Context as _;
use async_graphql::{
    http::GraphiQLSource, EmptySubscription, Error, Json, Object, Result, Schema, SimpleObject,
};
use async_graphql_axum::{GraphQLRequest, GraphQLResponse};
use axum::{extract::State, http::Method, response::Html, routing::get, Router};
use chrono::{DateTime, Utc};
use serde_json::{Map, Value};
use std::{net::SocketAddr, sync::Arc};
use tokio::{net::TcpListener, sync::RwLock};
use tower_http::cors::{Any, CorsLayer};
use uuid::Uuid;

#[derive(Clone, SimpleObject)]
struct GraphAttestation {
    id: Uuid,
    artifact_id: String,
    proof_type: String,
    timestamp: DateTime<Utc>,
    payload: Json<Value>,
    parents: Vec<Uuid>,
    signer_public_key: String,
    signature: String,
}

#[derive(Clone, SimpleObject)]
struct GraphConsistencyIssue {
    artifact_id: String,
    claim_key: String,
    conflicting_values: Vec<String>,
    attestation_ids: Vec<Uuid>,
}

#[derive(SimpleObject, Clone)]
struct GraphProofPath {
    artifact_id: String,
    attestation_ids: Vec<Uuid>,
    attestations: Vec<GraphAttestation>,
}

#[derive(async_graphql::InputObject)]
struct AttestationInput {
    id: Uuid,
    artifact_id: String,
    proof_type: String,
    timestamp: DateTime<Utc>,
    #[graphql(default_with = "empty_payload()")]
    payload: Json<Value>,
    #[graphql(default)]
    parents: Vec<Uuid>,
    signer_public_key: String,
    signature: String,
}

type SharedGraph = Arc<RwLock<AttestationGraph>>;
type AppSchema = Schema<QueryRoot, MutationRoot, EmptySubscription>;

struct QueryRoot;
struct MutationRoot;

#[Object]
impl QueryRoot {
    async fn proof_paths(
        &self,
        ctx: &async_graphql::Context<'_>,
        artifact_id: String,
        target_attestation_id: Option<Uuid>,
    ) -> Result<Vec<GraphProofPath>> {
        let graph = ctx.data::<SharedGraph>()?;
        let guard = graph.read().await;
        let paths = guard.proof_paths(&artifact_id, target_attestation_id);
        let mut results = Vec::with_capacity(paths.len());
        for path in paths {
            let attestations = materialize_attestations(&guard, &path)?;
            results.push(GraphProofPath {
                artifact_id: path.artifact_id,
                attestation_ids: path.attestation_ids,
                attestations,
            });
        }
        Ok(results)
    }

    async fn consistency_issues(
        &self,
        ctx: &async_graphql::Context<'_>,
        artifact_id: String,
    ) -> Result<Vec<GraphConsistencyIssue>> {
        let graph = ctx.data::<SharedGraph>()?;
        let guard = graph.read().await;
        Ok(guard
            .detect_inconsistencies(&artifact_id)
            .into_iter()
            .map(GraphConsistencyIssue::from)
            .collect())
    }

    async fn attestation(
        &self,
        ctx: &async_graphql::Context<'_>,
        id: Uuid,
    ) -> Result<Option<GraphAttestation>> {
        let graph = ctx.data::<SharedGraph>()?;
        let guard = graph.read().await;
        Ok(guard.get(&id).cloned().map(GraphAttestation::from))
    }
}

#[Object]
impl MutationRoot {
    async fn ingest_attestation(
        &self,
        ctx: &async_graphql::Context<'_>,
        input: AttestationInput,
    ) -> Result<GraphAttestation> {
        let graph = ctx.data::<SharedGraph>()?;
        let mut guard = graph.write().await;
        let attestation = input.into_attestation()?;
        guard
            .add_attestation(attestation.clone())
            .map_err(graphql_error)?;
        Ok(GraphAttestation::from(attestation))
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let graph = Arc::new(RwLock::new(AttestationGraph::new()));
    let schema = Schema::build(QueryRoot, MutationRoot, EmptySubscription)
        .data(graph)
        .finish();

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::POST, Method::GET])
        .allow_headers(Any);

    let app = Router::new()
        .route("/graphql", get(graphiql).post(graphql_handler))
        .with_state(schema.clone())
        .layer(cors);

    let addr: SocketAddr = std::env::var("AGQL_BIND_ADDRESS")
        .unwrap_or_else(|_| "0.0.0.0:8080".to_string())
        .parse()
        .context("invalid AGQL_BIND_ADDRESS")?;

    let listener = TcpListener::bind(addr).await?;

    println!(
        "AGQL GraphQL API listening on http://{}/graphql",
        listener.local_addr()?
    );

    axum::serve(listener, app.into_make_service()).await?;

    Ok(())
}

async fn graphql_handler(State(schema): State<AppSchema>, req: GraphQLRequest) -> GraphQLResponse {
    schema.execute(req.into_inner()).await.into()
}

async fn graphiql() -> Html<String> {
    Html(GraphiQLSource::build().endpoint("/graphql").finish())
}

fn graphql_error(err: DagError) -> Error {
    Error::new(err.to_string())
}

fn materialize_attestations(
    graph: &AttestationGraph,
    path: &ProofPath,
) -> Result<Vec<GraphAttestation>> {
    let mut result = Vec::with_capacity(path.attestation_ids.len());
    for id in &path.attestation_ids {
        let attestation = graph
            .get(id)
            .cloned()
            .ok_or_else(|| Error::new(format!("attestation {id} missing from graph")))?;
        result.push(GraphAttestation::from(attestation));
    }
    Ok(result)
}

fn empty_payload() -> Json<Value> {
    Json(Value::Object(Map::new()))
}

impl From<Attestation> for GraphAttestation {
    fn from(att: Attestation) -> Self {
        let Attestation {
            id,
            artifact_id,
            proof_type,
            timestamp,
            payload,
            parents,
            signer_public_key,
            signature,
        } = att;

        GraphAttestation {
            id,
            artifact_id,
            proof_type,
            timestamp,
            payload: Json(Value::Object(payload)),
            parents,
            signer_public_key,
            signature,
        }
    }
}

impl From<ConsistencyIssue> for GraphConsistencyIssue {
    fn from(issue: ConsistencyIssue) -> Self {
        GraphConsistencyIssue {
            artifact_id: issue.artifact_id,
            claim_key: issue.claim_key,
            conflicting_values: issue.conflicting_values,
            attestation_ids: issue.attestation_ids,
        }
    }
}

impl AttestationInput {
    fn into_attestation(self) -> Result<Attestation> {
        let payload = match self.payload.0 {
            Value::Object(map) => map,
            _ => return Err(Error::new("payload must be a JSON object")),
        };

        Ok(Attestation {
            id: self.id,
            artifact_id: self.artifact_id,
            proof_type: self.proof_type,
            timestamp: self.timestamp,
            payload,
            parents: self.parents,
            signer_public_key: self.signer_public_key,
            signature: self.signature,
        })
    }
}
