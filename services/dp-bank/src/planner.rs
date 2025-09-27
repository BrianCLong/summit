use crate::models::{PlannerRequest, PlannerResponse, QueryAllocation, QuerySpec};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum PlannerError {
    #[error("planner requires at least one query")]
    EmptyQueries,
    #[error("query `{query}` must have positive sensitivity")]
    NonPositiveSensitivity { query: String },
    #[error("query `{query}` must have a positive target error")]
    NonPositiveTargetError { query: String },
    #[error(
        "total epsilon budget {provided:.4} is insufficient for requested accuracy; requires {required:.4}"
    )]
    InsufficientBudget { required: f64, provided: f64 },
}

fn minimal_epsilon(query: &QuerySpec) -> Result<f64, PlannerError> {
    if query.sensitivity <= 0.0 {
        return Err(PlannerError::NonPositiveSensitivity {
            query: query.name.clone(),
        });
    }
    if query.target_error <= 0.0 {
        return Err(PlannerError::NonPositiveTargetError {
            query: query.name.clone(),
        });
    }
    Ok(query.sensitivity / query.target_error)
}

pub fn plan_allocations(request: &PlannerRequest) -> Result<PlannerResponse, PlannerError> {
    if request.queries.is_empty() {
        return Err(PlannerError::EmptyQueries);
    }

    let mut allocations = Vec::with_capacity(request.queries.len());
    let mut required_total = 0.0_f64;

    for query in &request.queries {
        let epsilon = minimal_epsilon(query)?;
        required_total += epsilon;
        allocations.push(QueryAllocation {
            name: query.name.clone(),
            epsilon,
            achieved_error: query.sensitivity / epsilon,
        });
    }

    if let Some(budget) = request.total_budget {
        if budget + f64::EPSILON < required_total {
            return Err(PlannerError::InsufficientBudget {
                required: required_total,
                provided: budget,
            });
        }
    }

    Ok(PlannerResponse {
        total_epsilon: required_total,
        allocations,
    })
}
