use std::collections::HashSet;

use proptest::prelude::*;
use zk_tx_svc::{
    commitment::pedersen_mimc_stub, OverlapCircuit, OverlapProofRequest, PedersenMiMCCircuit,
    RedTeamAnalyzer, TenantCommitment,
};

fn make_tenant(commitments: Vec<String>) -> TenantCommitment {
    TenantCommitment { commitments }
}

fn commit_unique(values: Vec<String>, tenant: &str) -> Vec<String> {
    values
        .into_iter()
        .enumerate()
        .map(|(idx, value)| pedersen_mimc_stub(&value, &format!("{tenant}-{idx}")))
        .collect()
}

fn request_from_tenants(
    tenant_a: TenantCommitment,
    tenant_b: TenantCommitment,
    red_team: bool,
) -> OverlapProofRequest {
    OverlapProofRequest {
        tenant_a,
        tenant_b,
        circuit_hint: None,
        red_team,
    }
}

proptest! {
    #[test]
    fn completeness_holds(
        common in prop::collection::vec(0u32..1024, 1..5),
        unique_a in prop::collection::vec(1025u32..2048, 0..5),
        unique_b in prop::collection::vec(2049u32..3072, 0..5),
    ) {
        let common: HashSet<String> = common.into_iter().map(|v| format!("selector-{v}"))
            .collect();
        let unique_a: HashSet<String> = unique_a.into_iter().map(|v| format!("a-{v}"))
            .collect();
        let unique_b: HashSet<String> = unique_b.into_iter().map(|v| format!("b-{v}"))
            .collect();

        let shared_commitments: Vec<String> = common
            .iter()
            .enumerate()
            .map(|(idx, value)| pedersen_mimc_stub(value, &format!("shared-{idx}")))
            .collect();
        let unique_a_commitments =
            commit_unique(unique_a.into_iter().collect::<Vec<_>>(), "tenant-a");
        let unique_b_commitments =
            commit_unique(unique_b.into_iter().collect::<Vec<_>>(), "tenant-b");

        let mut commitments_a = shared_commitments.clone();
        commitments_a.extend(unique_a_commitments);
        let mut commitments_b = shared_commitments;
        commitments_b.extend(unique_b_commitments);

        let tenant_a = make_tenant(commitments_a);
        let tenant_b = make_tenant(commitments_b);

        let circuit = PedersenMiMCCircuit::new();
        let proof = circuit.prove_overlap(&tenant_a, &tenant_b).unwrap();
        prop_assert!(proof.overlap);
    }
}

proptest! {
    #[test]
    fn soundness_holds(
        unique_a in prop::collection::vec(0u32..1024, 0..5),
        unique_b in prop::collection::vec(1024u32..2048, 0..5),
    ) {
        let unique_a_strings: Vec<String> = unique_a
            .into_iter()
            .map(|v| format!("tenant-a-{v}"))
            .collect();
        let unique_b_strings: Vec<String> = unique_b
            .into_iter()
            .map(|v| format!("tenant-b-{v}"))
            .collect();

        let commitments_a = commit_unique(unique_a_strings, "tenant-a");
        let commitments_b = commit_unique(unique_b_strings, "tenant-b");

        let tenant_a = make_tenant(commitments_a);
        let tenant_b = make_tenant(commitments_b);

        let circuit = PedersenMiMCCircuit::new();
        let proof = circuit.prove_overlap(&tenant_a, &tenant_b).unwrap();
        prop_assert!(!proof.overlap);
    }
}

#[test]
fn red_team_mode_never_infers_raw_values() {
    let commitment = pedersen_mimc_stub("shared", "shared-0");
    let tenant_a = make_tenant(vec![commitment.clone()]);
    let tenant_b = make_tenant(vec![commitment]);
    let request = request_from_tenants(tenant_a.clone(), tenant_b.clone(), true);

    let circuit = PedersenMiMCCircuit::new();
    let proof = circuit.prove_overlap(&tenant_a, &tenant_b).unwrap();
    let report = RedTeamAnalyzer::attempt_inference(&request, &proof);

    assert!(!report.success, "red-team inference should fail");
    assert!(report.message.contains("Inference blocked"));
}
