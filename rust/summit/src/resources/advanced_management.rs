use std::collections::HashMap;
use uuid::Uuid;
use thiserror::Error;
use std::sync::Arc;
use tokio::sync::RwLock;

pub type TenantId = Uuid;
pub type ServiceId = Uuid;
pub type UserId = Uuid;

#[derive(Debug, Clone)]
pub struct ResourceRequest {
    pub tenant_id: TenantId,
    pub service_id: ServiceId,
    pub user_id: UserId,
    pub cpu_units: f64,
    pub memory_mb: f64,
}

pub struct QuotaToken {
    pub granted: bool,
}

#[derive(Debug, Error)]
pub enum QuotaError {
    #[error("User quota not found")]
    UserNotFound,
    #[error("Service quota not found")]
    ServiceNotFound,
    #[error("Tenant quota not found")]
    TenantNotFound,
    #[error("Quota exceeded: {0}")]
    Exceeded(String),
}

#[derive(Clone, Debug)]
pub struct ResourceLimit {
    pub cpu_limit: f64,
    pub memory_limit: f64,
}

impl ResourceLimit {
    pub fn check(&self, req: &ResourceRequest) -> bool {
        req.cpu_units <= self.cpu_limit && req.memory_mb <= self.memory_limit
    }

    pub fn min(&self, other: &Self) -> Self {
        Self {
            cpu_limit: self.cpu_limit.min(other.cpu_limit),
            memory_limit: self.memory_limit.min(other.memory_limit),
        }
    }
}

pub struct HierarchicalQuotaSystem {
    pub tenant_quotas: Arc<RwLock<HashMap<TenantId, ResourceLimit>>>,
    pub service_quotas: Arc<RwLock<HashMap<ServiceId, ResourceLimit>>>,
    pub user_quotas: Arc<RwLock<HashMap<UserId, ResourceLimit>>>,
}

impl HierarchicalQuotaSystem {
    pub fn new() -> Self {
        Self {
            tenant_quotas: Arc::new(RwLock::new(HashMap::new())),
            service_quotas: Arc::new(RwLock::new(HashMap::new())),
            user_quotas: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn check_quota(&self, request: &ResourceRequest) -> Result<QuotaToken, QuotaError> {
        let user_q = self.user_quotas.read().await;
        let service_q = self.service_quotas.read().await;
        let tenant_q = self.tenant_quotas.read().await;

        let u_limit = user_q.get(&request.user_id).ok_or(QuotaError::UserNotFound)?;
        let s_limit = service_q.get(&request.service_id).ok_or(QuotaError::ServiceNotFound)?;
        let t_limit = tenant_q.get(&request.tenant_id).ok_or(QuotaError::TenantNotFound)?;

        // Effective limit is the intersection (minimum) of all limits
        let effective = u_limit.min(s_limit).min(t_limit);

        if effective.check(request) {
            Ok(QuotaToken { granted: true })
        } else {
            Err(QuotaError::Exceeded(format!("Request {:?} exceeds effective limit {:?}", request, effective)))
        }
    }
}

pub struct CostCalculator {
    pub cpu_rate: f64,
    pub memory_rate: f64,
}

impl CostCalculator {
    pub fn calculate_cost(&self, request: &ResourceRequest) -> f64 {
        (request.cpu_units * self.cpu_rate) + (request.memory_mb * self.memory_rate)
    }
}

#[derive(Debug, Clone)]
pub struct Budget {
    pub remaining: f64,
}

pub struct BudgetTracker {
    budgets: Arc<RwLock<HashMap<TenantId, Budget>>>,
}

impl BudgetTracker {
    pub fn new() -> Self {
        Self { budgets: Arc::new(RwLock::new(HashMap::new())) }
    }

    pub async fn get_budget(&self, tenant_id: TenantId) -> Result<Budget, AllocationError> {
        self.budgets.read().await.get(&tenant_id).cloned().ok_or(AllocationError::Failed)
    }

    pub async fn record_allocation(&self, tenant_id: TenantId, cost: f64) {
        if let Some(budget) = self.budgets.write().await.get_mut(&tenant_id) {
            budget.remaining -= cost;
        }
    }
}

#[derive(Debug, Error)]
pub enum AllocationError {
    #[error("Budget exceeded: requested {requested}, remaining {remaining}")]
    BudgetExceeded {
        requested: f64,
        remaining: f64,
    },
    #[error("Allocation failed")]
    Failed,
}

pub struct ResourceAllocation {
    pub granted_cpu: f64,
    pub granted_memory: f64,
    pub cost: f64,
}

// 2. Cost-aware resource allocation
pub struct CostAwareAllocator {
    pub cost_calculator: CostCalculator,
    pub budget_tracker: BudgetTracker,
}

impl CostAwareAllocator {
    pub fn new(cpu_rate: f64, memory_rate: f64) -> Self {
        Self {
            cost_calculator: CostCalculator { cpu_rate, memory_rate },
            budget_tracker: BudgetTracker::new(),
        }
    }

    pub async fn allocate_resources(
        &self,
        request: ResourceRequest
    ) -> Result<ResourceAllocation, AllocationError> {
        let cost = self.cost_calculator.calculate_cost(&request);
        let budget = self.budget_tracker.get_budget(request.tenant_id).await?;

        if cost > budget.remaining {
            return Err(AllocationError::BudgetExceeded {
                requested: cost,
                remaining: budget.remaining,
            });
        }

        // Track allocation against budget
        self.budget_tracker.record_allocation(request.tenant_id, cost).await;

        Ok(ResourceAllocation {
            granted_cpu: request.cpu_units,
            granted_memory: request.memory_mb,
            cost,
        })
    }
}

pub struct AdvancedResourceManager {
    pub quota_system: HierarchicalQuotaSystem,
    pub cost_allocator: CostAwareAllocator,
}
