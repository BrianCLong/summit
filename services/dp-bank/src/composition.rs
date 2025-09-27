use crate::models::{
    AdvancedCompositionRequest, AdvancedCompositionResponse, ZcdpCompositionRequest,
    ZcdpCompositionResponse,
};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum CompositionError {
    #[error("delta_prime must be in (0, 1)")]
    InvalidDeltaPrime,
    #[error("delta values must be in [0, 1)")]
    InvalidDelta,
    #[error("epsilon values must be non-negative")]
    NegativeEpsilon,
    #[error("rho values must be non-negative")]
    NegativeRho,
    #[error("delta must be in (0, 1)")]
    InvalidZcdpDelta,
}

pub fn advanced_composition(
    request: &AdvancedCompositionRequest,
) -> Result<AdvancedCompositionResponse, CompositionError> {
    if !(0.0 < request.delta_prime && request.delta_prime < 1.0) {
        return Err(CompositionError::InvalidDeltaPrime);
    }

    if request.steps.iter().any(|step| step.epsilon < 0.0) {
        return Err(CompositionError::NegativeEpsilon);
    }

    if request
        .steps
        .iter()
        .any(|step| !(0.0 <= step.delta && step.delta < 1.0))
    {
        return Err(CompositionError::InvalidDelta);
    }

    let sum_eps_sq: f64 = request.steps.iter().map(|step| step.epsilon.powi(2)).sum();
    let exp_term: f64 = request
        .steps
        .iter()
        .map(|step| step.epsilon * (step.epsilon.exp() - 1.0))
        .sum();
    let epsilon = (2.0 * (1.0 / request.delta_prime).ln() * sum_eps_sq).sqrt() + exp_term;
    let delta = request.steps.iter().map(|step| step.delta).sum::<f64>() + request.delta_prime;

    Ok(AdvancedCompositionResponse { epsilon, delta })
}

pub fn zcdp_composition(
    request: &ZcdpCompositionRequest,
) -> Result<ZcdpCompositionResponse, CompositionError> {
    if !(0.0 < request.delta && request.delta < 1.0) {
        return Err(CompositionError::InvalidZcdpDelta);
    }

    if request.rhos.iter().any(|rho| *rho < 0.0) {
        return Err(CompositionError::NegativeRho);
    }

    let rho: f64 = request.rhos.iter().sum();
    let epsilon = if rho == 0.0 {
        0.0
    } else {
        rho + 2.0 * (rho * (1.0 / request.delta).ln()).sqrt()
    };
    Ok(ZcdpCompositionResponse {
        epsilon,
        delta: request.delta,
        rho,
    })
}
