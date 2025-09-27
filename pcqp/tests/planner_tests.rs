use pcqp::query::{Filter, FilterOp, Join, JoinStrategy, LiteralValue, LogicalQuery, Projection, TableRef};
use pcqp::{PlannerError, Simulator};
use serde_json::Value;

fn sample_query() -> LogicalQuery {
    LogicalQuery {
        selects: vec![
            Projection {
                table: "o".to_string(),
                column: "order_id".to_string(),
                alias: Some("order_id".to_string()),
            },
            Projection {
                table: "o".to_string(),
                column: "amount".to_string(),
                alias: Some("order_amount".to_string()),
            },
            Projection {
                table: "c".to_string(),
                column: "loyalty_tier".to_string(),
                alias: Some("tier".to_string()),
            },
        ],
        from: vec![
            TableRef {
                dataset: "orders".to_string(),
                alias: "o".to_string(),
            },
            TableRef {
                dataset: "customers".to_string(),
                alias: "c".to_string(),
            },
        ],
        filters: vec![Filter {
            table: "o".to_string(),
            column: "region".to_string(),
            op: FilterOp::Eq,
            value: LiteralValue::from("US"),
        }],
        joins: vec![Join {
            left: "o".to_string(),
            right: "c".to_string(),
            on: ("customer_id".to_string(), "customer_id".to_string()),
        }],
    }
}

#[test]
fn plan_respects_residency_policies() {
    let simulator = Simulator::new_default();
    let query = sample_query();
    let plan = simulator.plan(&query).expect("plan should succeed");

    let mut seen_broadcast = false;
    for subplan in &plan.subplans {
        match subplan.source_alias.as_str() {
            "c" => {
                assert_eq!(subplan.silo, pcqp::SiloId::Eu);
                assert_eq!(subplan.dataset, "customers");
                assert!(subplan.pushed_filters.is_empty());
                assert_eq!(subplan.pushed_projections, vec!["customer_id".to_string(), "loyalty_tier".to_string()]);
            }
            "o" => {
                assert_eq!(subplan.silo, pcqp::SiloId::Us);
                assert_eq!(subplan.dataset, "orders");
                assert_eq!(subplan.pushed_projections, vec![
                    "amount".to_string(),
                    "customer_id".to_string(),
                    "order_id".to_string(),
                    "region".to_string(),
                ]);
            }
            other => panic!("unexpected alias {other}"),
        }
    }

    if let Some(strategy) = &plan.coordinator.join_strategy {
        match strategy {
            JoinStrategy::Broadcast { build } => {
                assert_eq!(build, "c");
                seen_broadcast = true;
            }
            JoinStrategy::Hash => panic!("expected broadcast of sanitized EU dimension"),
        }
    }
    assert!(seen_broadcast, "broadcast join strategy must be selected");
}

#[test]
fn golden_plan_matches_snapshot() {
    let simulator = Simulator::new_default();
    let query = sample_query();
    let plan = simulator.plan(&query).expect("plan should succeed");
    let actual = serde_json::to_value(&plan).expect("plan serializable");
    let expected: Value = serde_json::from_str(include_str!("golden/compliant_plan.json"))
        .expect("golden plan should parse");
    assert_eq!(actual, expected, "planner output must match golden snapshot");
}

#[test]
fn end_to_end_results_match_centralized_baseline() {
    let simulator = Simulator::new_default();
    let query = sample_query();
    let plan = simulator.plan(&query).expect("plan should succeed");

    let federated = simulator.execute_plan(&query, &plan);
    let centralized = simulator.execute_centralized(&query);
    assert_eq!(federated, centralized, "federated execution should match baseline");
}

#[test]
fn compliance_trace_is_deterministic() {
    let simulator = Simulator::new_default();
    let query = sample_query();
    let first = simulator.plan(&query).expect("first plan");
    let second = simulator.plan(&query).expect("second plan");

    assert_eq!(first.compliance.events, second.compliance.events);
}

#[test]
fn non_exportable_columns_are_blocked() {
    let simulator = Simulator::new_default();
    let mut query = sample_query();
    query.selects.push(Projection {
        table: "c".to_string(),
        column: "name".to_string(),
        alias: Some("customer_name".to_string()),
    });

    let error = simulator.plan(&query).expect_err("planner must reject unsafe column export");
    match error {
        PlannerError::ColumnExportViolation { dataset, column } => {
            assert_eq!(dataset, "customers");
            assert_eq!(column, "name");
        }
        other => panic!("expected export violation, received {other:?}"),
    }
}
