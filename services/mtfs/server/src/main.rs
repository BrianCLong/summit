use std::collections::HashMap;
use std::net::SocketAddr;
use std::str::FromStr;
use std::sync::Arc;

use mtfs_core::{JobClass, JobRequest, PolicyTier, Scheduler, SchedulerConfig};
use tokio::sync::Mutex;
use tonic::{transport::Server, Request, Response, Status};

pub mod mtfs {
    tonic::include_proto!("mtfs");
}

use mtfs::mtfs_service_server::{MtfsService, MtfsServiceServer};
use mtfs::{
    Allocation, JobSubmission, NextAllocationRequest, SimulationRequest, SimulationResponse,
    SnapshotStreamResponse, WeightOverride,
};

#[derive(Clone)]
struct MtfsServiceImpl {
    scheduler: Arc<Mutex<Scheduler>>,
}

impl MtfsServiceImpl {
    fn new(seed: [u8; 32]) -> Self {
        let scheduler = Scheduler::new(SchedulerConfig::deterministic(seed));
        MtfsServiceImpl {
            scheduler: Arc::new(Mutex::new(scheduler)),
        }
    }

    fn map_allocation(snapshot: &mtfs_core::SignedSnapshot) -> Result<Allocation, Status> {
        let json = serde_json::to_string(&snapshot.snapshot)
            .map_err(|err| Status::internal(format!("snapshot serialization error: {err}")))?;
        Ok(Allocation {
            job_id: snapshot.snapshot.job_id,
            tenant_id: snapshot.snapshot.tenant_id.clone(),
            job_class: snapshot.snapshot.job_class.as_str().to_string(),
            policy_tier: snapshot.snapshot.policy_tier.as_str().to_string(),
            allocated_units: snapshot.snapshot.allocated_units,
            snapshot_json: json,
            signature: snapshot.signature.clone(),
            allocation_id: snapshot.snapshot.allocation_id,
            sla_breach: snapshot.snapshot.sla_breach,
            wait_rounds: snapshot.snapshot.wait_rounds,
        })
    }
}

#[tonic::async_trait]
impl MtfsService for MtfsServiceImpl {
    async fn submit_job(
        &self,
        request: Request<JobSubmission>,
    ) -> Result<Response<mtfs::JobSubmitResponse>, Status> {
        let payload = request.into_inner();
        let job_class = JobClass::from_str(&payload.job_class)
            .map_err(|err| Status::invalid_argument(err.to_string()))?;
        let policy_tier = PolicyTier::from_str(&payload.policy_tier)
            .map_err(|err| Status::invalid_argument(err.to_string()))?;
        let job_request = JobRequest {
            tenant_id: payload.tenant_id,
            job_class,
            policy_tier,
            resource_units: payload.resource_units,
            weight: payload.weight,
        };
        let mut scheduler = self.scheduler.lock().await;
        let job_id = scheduler.submit_job(job_request);
        Ok(Response::new(mtfs::JobSubmitResponse {
            job_id: job_id.as_u64(),
        }))
    }

    async fn next_allocation(
        &self,
        _request: Request<NextAllocationRequest>,
    ) -> Result<Response<Allocation>, Status> {
        let mut scheduler = self.scheduler.lock().await;
        let outcome = scheduler
            .schedule_next()
            .map_err(|_| Status::not_found("no allocation available"))?;
        let allocation = Self::map_allocation(&outcome.snapshot)?;
        Ok(Response::new(allocation))
    }

    async fn stream_snapshots(
        &self,
        _request: Request<NextAllocationRequest>,
    ) -> Result<Response<SnapshotStreamResponse>, Status> {
        let scheduler = self.scheduler.lock().await;
        let mut snapshots = Vec::new();
        for snapshot in scheduler.snapshots() {
            snapshots.push(Self::map_allocation(snapshot)?);
        }
        Ok(Response::new(SnapshotStreamResponse { snapshots }))
    }

    async fn simulate(
        &self,
        request: Request<SimulationRequest>,
    ) -> Result<Response<SimulationResponse>, Status> {
        let payload = request.into_inner();
        let mut overrides = HashMap::new();
        for WeightOverride { tenant_id, weight } in payload.overrides {
            overrides.insert(tenant_id, weight);
        }
        let scheduler = self.scheduler.lock().await;
        let report = scheduler.simulate_weight_change(&overrides, payload.steps as usize);
        let mut allocations = Vec::new();
        for snapshot in report.allocations.iter() {
            allocations.push(Self::map_allocation(snapshot)?);
        }
        Ok(Response::new(SimulationResponse { allocations }))
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let service = MtfsServiceImpl::new([1u8; 32]);
    let addr: SocketAddr = "0.0.0.0:50051".parse()?;
    println!("MTFS service listening on {addr}");
    Server::builder()
        .add_service(MtfsServiceServer::new(service))
        .serve(addr)
        .await?;
    Ok(())
}
