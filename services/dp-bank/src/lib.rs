pub mod audit;
pub mod composition;
pub mod crypto;
pub mod models;
pub mod planner;
pub mod server;
pub mod state;

pub use audit::{AuditExportError, export_audit_csv, export_audit_json};
pub use composition::{CompositionError, advanced_composition, zcdp_composition};
pub use models::{
    AdvancedCompositionRequest, AdvancedCompositionResponse, AuditAction, AuditEvent,
    BudgetAccountSummary, GrantPayload, PlannerRequest, PlannerResponse, QueryAllocation,
    QuerySpec, RegisterKeyRequest, SignedGrant, SpendRequest, ZcdpCompositionRequest,
    ZcdpCompositionResponse,
};
pub use planner::{PlannerError, plan_allocations};
pub use state::{DpBank, DpBankError};

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto::{encode_public_key, grant_message_bytes};
    use crate::models::{
        AdvancedCompositionRequest, DpStep, GrantPayload, PlannerRequest, QuerySpec,
        RegisterKeyRequest, SignedGrant, SpendRequest, ZcdpCompositionRequest,
    };
    use chrono::Utc;
    use ed25519_dalek::{Keypair, Signer};
    use once_cell::sync::Lazy;
    use rand::SeedableRng;
    use rand::rngs::StdRng;

    static RNG_SEED: Lazy<[u8; 32]> = Lazy::new(|| [42u8; 32]);

    #[test]
    fn advanced_composition_matches_reference() {
        let request = AdvancedCompositionRequest {
            steps: vec![
                DpStep {
                    epsilon: 0.5,
                    delta: 1e-6,
                },
                DpStep {
                    epsilon: 0.75,
                    delta: 1e-6,
                },
            ],
            delta_prime: 1e-5,
        };

        let result = advanced_composition(&request).expect("composition succeeds");
        let sum_eps_sq = 0.5f64.powi(2) + 0.75f64.powi(2);
        let exp_term = 0.5 * (0.5f64.exp() - 1.0) + 0.75 * (0.75f64.exp() - 1.0);
        let expected_epsilon =
            (2.0 * (1.0 / request.delta_prime).ln() * sum_eps_sq).sqrt() + exp_term;
        let expected_delta = 1e-6 + 1e-6 + request.delta_prime;

        assert!((result.epsilon - expected_epsilon).abs() < 1e-12);
        assert!((result.delta - expected_delta).abs() < 1e-12);
    }

    #[test]
    fn zcdp_composition_matches_reference() {
        let request = ZcdpCompositionRequest {
            rhos: vec![0.5, 0.25],
            delta: 1e-6,
        };
        let result = zcdp_composition(&request).expect("zCDP conversion");
        let rho = 0.75;
        let expected_epsilon = rho + 2.0 * (rho * (1.0 / request.delta).ln()).sqrt();

        assert!((result.rho - rho).abs() < 1e-12);
        assert!((result.epsilon - expected_epsilon).abs() < 1e-12);
        assert_eq!(result.delta, request.delta);
    }

    #[test]
    fn planner_meets_error_targets() {
        let request = PlannerRequest {
            total_budget: Some(12.0),
            queries: vec![
                QuerySpec {
                    name: "daily_users".to_string(),
                    sensitivity: 1.0,
                    target_error: 0.2,
                },
                QuerySpec {
                    name: "revenue".to_string(),
                    sensitivity: 2.0,
                    target_error: 0.5,
                },
            ],
        };

        let plan = plan_allocations(&request).expect("planner success");
        let required_total = 1.0 / 0.2 + 2.0 / 0.5;
        assert!((plan.total_epsilon - required_total).abs() < 1e-9);
        for allocation in &plan.allocations {
            let spec = request
                .queries
                .iter()
                .find(|q| q.name == allocation.name)
                .unwrap();
            assert!(allocation.achieved_error <= spec.target_error + 1e-12);
        }
    }

    #[test]
    fn planner_rejects_insufficient_budget() {
        let request = PlannerRequest {
            total_budget: Some(0.1),
            queries: vec![QuerySpec {
                name: "count".to_string(),
                sensitivity: 1.0,
                target_error: 0.1,
            }],
        };

        let err = plan_allocations(&request).unwrap_err();
        match err {
            PlannerError::InsufficientBudget { .. } => {}
            other => panic!("unexpected error {other}"),
        }
    }

    #[test]
    fn dp_bank_applies_signed_grants_and_exports_audit() {
        let bank = DpBank::new();
        let mut rng = StdRng::from_seed(*RNG_SEED);
        let keypair = Keypair::generate(&mut rng);
        let tenant = "tenant-a";
        let project = "project-x";
        bank.register_key(
            tenant,
            RegisterKeyRequest {
                key_id: "primary".to_string(),
                public_key: encode_public_key(&keypair.public),
            },
        )
        .expect("register key");

        let payload = GrantPayload {
            tenant_id: tenant.to_string(),
            project_id: project.to_string(),
            key_id: "primary".to_string(),
            epsilon: 5.0,
            delta: 1e-6,
            nonce: "grant-001".to_string(),
            issued_at: Utc::now(),
        };
        let message = grant_message_bytes(&payload).expect("serialize payload");
        let signature = keypair.sign(&message).to_bytes().to_vec();
        let grant = SignedGrant { payload, signature };

        let summary = bank.apply_grant(grant).expect("apply grant");
        assert_eq!(summary.allocated_epsilon, 5.0);
        assert_eq!(summary.remaining_epsilon, 5.0);

        let summary = bank
            .record_spend(
                tenant,
                project,
                SpendRequest {
                    epsilon: 1.0,
                    delta: 5e-7,
                    query_id: Some("daily_users".to_string()),
                    note: Some("daily report".to_string()),
                },
            )
            .expect("record spend");
        assert!((summary.remaining_epsilon - 4.0).abs() < 1e-9);
        assert!((summary.remaining_delta - 5e-7).abs() < 1e-12);

        let csv_one = bank.export_audit_csv().expect("export csv");
        let csv_two = bank.export_audit_csv().expect("export csv repeat");
        assert_eq!(csv_one, csv_two);
        assert!(csv_one.contains("grant_applied"));
        assert!(csv_one.contains("spend_recorded"));

        let json = bank.export_audit_json().expect("export json");
        assert!(json.contains("grant-001"));
    }
}
