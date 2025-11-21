use apm::{AccessPathMinimizer, JoinStat, TableSpec, TaskGoal, TradeoffSimulator};

fn baseline_sql() -> &'static str {
    "SELECT o.order_id, o.customer_id, o.total, c.name, c.email, r.region_name\n\
     FROM orders o\n\
     JOIN customers c ON o.customer_id = c.id\n\
     LEFT JOIN regions r ON c.region_id = r.id"
}

fn table_specs() -> Vec<TableSpec> {
    vec![
        TableSpec {
            name: "orders".to_string(),
            alias: Some("o".to_string()),
            row_count: 10_000,
            columns: vec!["order_id".into(), "customer_id".into(), "total".into()],
        },
        TableSpec {
            name: "customers".to_string(),
            alias: Some("c".to_string()),
            row_count: 5_000,
            columns: vec![
                "id".into(),
                "name".into(),
                "email".into(),
                "region_id".into(),
            ],
        },
        TableSpec {
            name: "regions".to_string(),
            alias: Some("r".to_string()),
            row_count: 5,
            columns: vec!["id".into(), "region_name".into()],
        },
    ]
}

fn join_stats() -> Vec<JoinStat> {
    vec![JoinStat {
        alias: "r".to_string(),
        accuracy_if_removed: 0.98,
        relative_cost: 3.0,
    }]
}

#[test]
fn reduced_plan_meets_accuracy_and_limits_exposure() {
    let planner = AccessPathMinimizer::new(table_specs(), join_stats());
    let goal = TaskGoal {
        required_columns: vec!["o.order_id".into(), "o.total".into(), "c.name".into()],
        accuracy_target: 0.95,
    };

    let outcome = planner
        .plan(baseline_sql(), &goal)
        .expect("planner should succeed");

    assert!(outcome.achieved_accuracy >= goal.accuracy_target);
    assert!(
        outcome.exposure_delta.reduced.columns < outcome.exposure_delta.baseline.columns,
        "columns should be reduced"
    );
    assert!(
        outcome.exposure_delta.reduced.rows < outcome.exposure_delta.baseline.rows,
        "rows should be reduced"
    );
    assert_eq!(outcome.removed_joins, vec!["r".to_string()]);

    let expected_sql = "SELECT o.order_id, o.total, c.name FROM orders AS o JOIN customers AS c ON o.customer_id = c.id";
    assert_eq!(outcome.reduced_sql, expected_sql);
}

#[test]
fn planner_respects_accuracy_thresholds() {
    let planner = AccessPathMinimizer::new(table_specs(), join_stats());
    let goal = TaskGoal {
        required_columns: vec!["o.order_id".into(), "o.total".into(), "c.name".into()],
        accuracy_target: 0.995,
    };

    let outcome = planner
        .plan(baseline_sql(), &goal)
        .expect("planner should succeed");

    assert!(outcome.removed_joins.is_empty());
    assert!(outcome.exposure_delta.reduced.columns < outcome.exposure_delta.baseline.columns);
}

#[test]
fn planner_is_deterministic() {
    let planner = AccessPathMinimizer::new(table_specs(), join_stats());
    let goal = TaskGoal {
        required_columns: vec!["o.order_id".into(), "o.total".into(), "c.name".into()],
        accuracy_target: 0.95,
    };

    let first = planner.plan(baseline_sql(), &goal).unwrap();
    let second = planner.plan(baseline_sql(), &goal).unwrap();

    assert_eq!(first.reduced_sql, second.reduced_sql);
    assert_eq!(first.exposure_delta, second.exposure_delta);
    assert_eq!(first.removed_joins, second.removed_joins);
}

#[test]
fn simulator_reports_monotonic_tradeoffs() {
    let planner = AccessPathMinimizer::new(table_specs(), join_stats());
    let simulator = TradeoffSimulator::new(&planner, baseline_sql()).unwrap();
    let points = simulator.simulate();

    assert_eq!(points.len(), 2, "one optional join yields two scenarios");
    assert!(points[1].estimated_cost <= points[0].estimated_cost);
    assert!(points[1].achieved_accuracy <= points[0].achieved_accuracy);
}
