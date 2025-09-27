use dpsc::{Mechanism, compile_query};

#[test]
fn compiles_group_by_query_with_laplace() {
    let sql = "SELECT /*dp:epsilon=1.2 mech=laplace lower=0 upper=10 job=hr*/ department, COUNT(*) AS c, SUM(salary) AS total FROM employees GROUP BY department";
    let artifacts = compile_query(sql).expect("compile");

    assert!(artifacts.rewritten.sql.contains("COUNT(*) + laplace_noise"));
    assert!(
        artifacts
            .rewritten
            .sql
            .contains("SUM(salary) + laplace_noise")
    );
    assert_eq!(artifacts.ledger.entries.len(), 2);
    let epsilon = artifacts.ledger.cumulative_epsilon("hr");
    assert!((epsilon - 1.2).abs() < 1e-9);

    let stub = &artifacts.test_stubs[0];
    let first = stub.run();
    let second = stub.run();
    assert!(first.unbiased);
    assert_eq!(first.observed_mean, second.observed_mean);
    assert_eq!(first.observed_variance, second.observed_variance);
}

#[test]
fn compiles_avg_with_gaussian_and_tracks_delta() {
    let sql = "SELECT /*dp:epsilon=0.8 mech=gaussian delta=1e-5 lower=0 upper=5 job=analytics*/ AVG(score) AS avg_score FROM exams";
    let artifacts = compile_query(sql).expect("compile");

    assert!(artifacts.rewritten.sql.contains("gaussian_noise"));
    assert_eq!(artifacts.ledger.entries.len(), 2);
    let epsilon = artifacts.ledger.cumulative_epsilon("analytics");
    assert!((epsilon - 0.8).abs() < 1e-9);
    let delta = artifacts.ledger.cumulative_delta("analytics");
    assert!((delta - 1e-5).abs() < 1e-12);

    let sum_stub = artifacts
        .test_stubs
        .iter()
        .find(|stub| stub.target.ends_with("__sum"))
        .expect("sum stub");
    assert_eq!(sum_stub.mechanism, Mechanism::Gaussian);
    let check = sum_stub.run();
    assert!(check.unbiased);
}
