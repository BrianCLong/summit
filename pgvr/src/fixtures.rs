use std::collections::HashMap;
use std::fs::File;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use serde::Deserialize;

use crate::backend::{BackendKind, HnswBackend, IvfBackend, VectorBackend};
use crate::error::{PgvrError, PgvrResult};
use crate::policy::Policy;
use crate::router::{PgvrRouter, Shard};
use crate::types::VectorRecord;

pub fn load_from_file(path: impl AsRef<Path>) -> PgvrResult<PgvrRouter> {
    let path = path.as_ref();
    let mut file = File::open(path).map_err(|err| PgvrError::Fixture(err.to_string()))?;
    load_from_reader(&mut file)
}

pub fn load_from_reader(reader: &mut dyn Read) -> PgvrResult<PgvrRouter> {
    let mut buffer = String::new();
    reader
        .read_to_string(&mut buffer)
        .map_err(|err| PgvrError::Fixture(err.to_string()))?;
    load_from_str(&buffer)
}

pub fn load_from_str(data: &str) -> PgvrResult<PgvrRouter> {
    let fixture: FixtureFile =
        serde_json::from_str(data).map_err(|err| PgvrError::Fixture(err.to_string()))?;
    build_router(fixture)
}

pub fn sample_router() -> PgvrRouter {
    load_from_str(include_str!("../fixtures/sample-fixture.json"))
        .expect("sample fixture must be valid")
}

pub fn sample_fixture_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("fixtures/sample-fixture.json")
}

fn build_router(fixture: FixtureFile) -> PgvrResult<PgvrRouter> {
    let mut router = PgvrRouter::new();

    for tenant in fixture.tenants {
        let TenantFixture { tenant_id, shards } = tenant;
        for shard in shards {
            let ShardFixture {
                index_id,
                backend,
                policy,
                records,
            } = shard;

            let backend = create_backend(&tenant_id, backend, records)?;
            let shard_instance = Shard::new(index_id, backend, policy.into_policy());
            router.register_shard(tenant_id.clone(), shard_instance);
        }
    }

    Ok(router)
}

fn create_backend(
    tenant_id: &str,
    backend: BackendKind,
    records: Vec<RecordFixture>,
) -> PgvrResult<Arc<dyn VectorBackend>> {
    let converted: Vec<VectorRecord> = records
        .into_iter()
        .map(|record| record.into_record(tenant_id))
        .collect();

    let backend: Arc<dyn VectorBackend> = match backend {
        BackendKind::Hnsw => Arc::new(HnswBackend::new(converted)),
        BackendKind::Ivf => Arc::new(IvfBackend::new(converted)),
    };

    Ok(backend)
}

#[derive(Debug, Deserialize)]
struct FixtureFile {
    tenants: Vec<TenantFixture>,
}

#[derive(Debug, Deserialize)]
struct TenantFixture {
    #[serde(rename = "tenantId")]
    tenant_id: String,
    shards: Vec<ShardFixture>,
}

#[derive(Debug, Deserialize)]
struct ShardFixture {
    #[serde(rename = "indexId")]
    index_id: String,
    backend: BackendKind,
    policy: PolicyFixture,
    records: Vec<RecordFixture>,
}

#[derive(Debug, Deserialize)]
struct PolicyFixture {
    #[serde(rename = "policyHash")]
    policy_hash: String,
    #[serde(default, rename = "denyFields")]
    deny_fields: HashMap<String, Vec<String>>,
    #[serde(default, rename = "allowedJurisdictions")]
    allowed_jurisdictions: Vec<String>,
    #[serde(default, rename = "allowedPurposes")]
    allowed_purposes: Vec<String>,
}

impl PolicyFixture {
    fn into_policy(self) -> Policy {
        let deny_fields = self
            .deny_fields
            .into_iter()
            .map(|(record_id, fields)| (record_id, fields.into_iter().collect()))
            .collect();
        Policy {
            policy_hash: self.policy_hash,
            deny_fields,
            allowed_jurisdictions: self.allowed_jurisdictions.into_iter().collect(),
            allowed_purposes: self.allowed_purposes.into_iter().collect(),
        }
    }
}

#[derive(Debug, Deserialize)]
struct RecordFixture {
    id: String,
    vector: Vec<f32>,
    #[serde(default)]
    fields: HashMap<String, String>,
    #[serde(default)]
    jurisdictions: Vec<String>,
    #[serde(default)]
    purposes: Vec<String>,
}

impl RecordFixture {
    fn into_record(self, tenant_id: &str) -> VectorRecord {
        VectorRecord {
            id: self.id,
            tenant_id: tenant_id.to_string(),
            vector: self.vector,
            fields: self.fields,
            jurisdictions: self.jurisdictions.into_iter().collect(),
            purposes: self.purposes.into_iter().collect(),
        }
    }
}
