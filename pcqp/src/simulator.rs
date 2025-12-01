use crate::capability::{CapabilityCatalog, DatasetCapability, PolicyBinding, Residency, SiloCapability, SiloId};
use crate::planner::{FederatedPlan, Planner, PlannerConfig, PlannerError};
use crate::query::{Filter, Join, LiteralValue, LogicalQuery, Projection};
use indexmap::IndexMap;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Row(pub IndexMap<String, LiteralValue>);

impl Row {
    fn get(&self, column: &str) -> Option<&LiteralValue> {
        self.0.get(column)
    }

    fn project(&self, columns: &[String]) -> Row {
        let mut projected = IndexMap::new();
        for column in columns {
            if let Some(value) = self.0.get(column) {
                projected.insert(column.clone(), value.clone());
            }
        }
        Row(projected)
    }
}

pub struct Simulator {
    catalog: CapabilityCatalog,
    data: IndexMap<String, (SiloId, Vec<Row>)>,
    config: PlannerConfig,
}

impl Simulator {
    pub fn new_default() -> Self {
        let eu_customers = DatasetCapability {
            name: "customers".to_string(),
            residency: Residency::Eu,
            columns: vec![
                "customer_id".to_string(),
                "name".to_string(),
                "loyalty_tier".to_string(),
                "region".to_string(),
            ],
            exportable_columns: Some(vec!["customer_id".to_string(), "loyalty_tier".to_string()]),
            size_bytes: 64 * 1024,
            allowed_consumers: vec![SiloId::Eu, SiloId::Us],
        };

        let us_orders = DatasetCapability {
            name: "orders".to_string(),
            residency: Residency::Us,
            columns: vec![
                "order_id".to_string(),
                "customer_id".to_string(),
                "amount".to_string(),
                "region".to_string(),
            ],
            exportable_columns: None,
            size_bytes: 128 * 1024,
            allowed_consumers: vec![SiloId::Us, SiloId::Eu],
        };

        let apac_support = DatasetCapability {
            name: "support_tickets".to_string(),
            residency: Residency::Apac,
            columns: vec![
                "ticket_id".to_string(),
                "customer_id".to_string(),
                "status".to_string(),
            ],
            exportable_columns: Some(vec!["ticket_id".to_string(), "status".to_string()]),
            size_bytes: 32 * 1024,
            allowed_consumers: vec![SiloId::Apac],
        };

        let catalog = CapabilityCatalog::new(vec![
            SiloCapability::new(
                SiloId::Eu,
                vec![eu_customers.clone()],
                vec![PolicyBinding {
                    policy_id: "policy::residency::eu".to_string(),
                    description: "EU personal data must remain in-region".to_string(),
                }],
            ),
            SiloCapability::new(
                SiloId::Us,
                vec![us_orders.clone()],
                vec![PolicyBinding {
                    policy_id: "policy::residency::us".to_string(),
                    description: "US operational data governed by US residency".to_string(),
                }],
            ),
            SiloCapability::new(
                SiloId::Apac,
                vec![apac_support.clone()],
                vec![PolicyBinding {
                    policy_id: "policy::residency::apac".to_string(),
                    description: "APAC data cannot leave APAC".to_string(),
                }],
            ),
        ]);

        let mut data: IndexMap<String, (SiloId, Vec<Row>)> = IndexMap::new();
        data.insert(
            "customers".to_string(),
            (
                SiloId::Eu,
                vec![
                    Row(IndexMap::from_iter(vec![
                        ("customer_id".to_string(), LiteralValue::Int(1)),
                        ("name".to_string(), LiteralValue::String("Alicia".to_string())),
                        ("loyalty_tier".to_string(), LiteralValue::String("gold".to_string())),
                        ("region".to_string(), LiteralValue::String("EU".to_string())),
                    ])),
                    Row(IndexMap::from_iter(vec![
                        ("customer_id".to_string(), LiteralValue::Int(2)),
                        ("name".to_string(), LiteralValue::String("Boris".to_string())),
                        ("loyalty_tier".to_string(), LiteralValue::String("silver".to_string())),
                        ("region".to_string(), LiteralValue::String("EU".to_string())),
                    ])),
                ],
            ),
        );
        data.insert(
            "orders".to_string(),
            (
                SiloId::Us,
                vec![
                    Row(IndexMap::from_iter(vec![
                        ("order_id".to_string(), LiteralValue::Int(10)),
                        ("customer_id".to_string(), LiteralValue::Int(1)),
                        ("amount".to_string(), LiteralValue::Int(120)),
                        ("region".to_string(), LiteralValue::String("US".to_string())),
                    ])),
                    Row(IndexMap::from_iter(vec![
                        ("order_id".to_string(), LiteralValue::Int(11)),
                        ("customer_id".to_string(), LiteralValue::Int(3)),
                        ("amount".to_string(), LiteralValue::Int(90)),
                        ("region".to_string(), LiteralValue::String("US".to_string())),
                    ])),
                ],
            ),
        );
        data.insert(
            "support_tickets".to_string(),
            (
                SiloId::Apac,
                vec![
                    Row(IndexMap::from_iter(vec![
                        ("ticket_id".to_string(), LiteralValue::Int(100)),
                        ("customer_id".to_string(), LiteralValue::Int(4)),
                        ("status".to_string(), LiteralValue::String("open".to_string())),
                    ])),
                ],
            ),
        );

        Self {
            catalog,
            data,
            config: PlannerConfig::default(),
        }
    }

    pub fn planner(&self) -> Planner {
        Planner::new(self.catalog.clone(), self.config.clone())
    }

    pub fn plan(&self, query: &LogicalQuery) -> Result<FederatedPlan, PlannerError> {
        self.planner().plan(query)
    }

    pub fn execute_plan(
        &self,
        query: &LogicalQuery,
        plan: &FederatedPlan,
    ) -> Vec<IndexMap<String, LiteralValue>> {
        let mut per_alias: IndexMap<String, Vec<Row>> = IndexMap::new();
        for subplan in &plan.subplans {
            let (silo, rows) = self
                .data
                .get(&subplan.dataset)
                .expect("dataset must exist in simulator");
            assert_eq!(silo, &subplan.silo, "plan violates residency policy");

            let mut filtered = Vec::new();
            for row in rows {
                if subplan
                    .pushed_filters
                    .iter()
                    .all(|filter| filter_matches(row, filter))
                {
                    filtered.push(row.project(&subplan.pushed_projections));
                }
            }
            per_alias.insert(subplan.source_alias.clone(), filtered);
        }

        assemble_results(query, per_alias)
    }

    pub fn execute_centralized(&self, query: &LogicalQuery) -> Vec<IndexMap<String, LiteralValue>> {
        let mut per_alias: IndexMap<String, Vec<Row>> = IndexMap::new();
        for table in &query.from {
            let (_, rows) = self
                .data
                .get(&table.dataset)
                .expect("dataset must exist in simulator");
            let table_filters: Vec<Filter> = query
                .filters
                .iter()
                .filter(|filter| filter.table_alias() == table.alias)
                .cloned()
                .collect();

            let mut filtered = Vec::new();
            for row in rows {
                if table_filters.iter().all(|filter| filter_matches(row, filter)) {
                    filtered.push(row.clone());
                }
            }
            per_alias.insert(table.alias.clone(), filtered);
        }

        assemble_results(query, per_alias)
    }

    pub fn catalog(&self) -> &CapabilityCatalog {
        &self.catalog
    }
}

fn assemble_results(
    query: &LogicalQuery,
    mut per_alias: IndexMap<String, Vec<Row>>,
) -> Vec<IndexMap<String, LiteralValue>> {
    let mut results = Vec::new();
    if let Some(join) = query.joins.first() {
        let left_rows = per_alias
            .shift_remove(&join.left)
            .unwrap_or_default();
        let right_rows = per_alias
            .shift_remove(&join.right)
            .unwrap_or_default();
        let joined = join_rows(&left_rows, &right_rows, join);
        for (left, right) in joined {
            let mut context = IndexMap::new();
            context.insert(join.left.clone(), left);
            context.insert(join.right.clone(), right);
            results.push(materialize(&query.selects, &context));
        }
    } else if let Some(table) = query.from.first() {
        let rows = per_alias
            .shift_remove(&table.alias)
            .unwrap_or_default();
        for row in rows {
            let mut context = IndexMap::new();
            context.insert(table.alias.clone(), row);
            results.push(materialize(&query.selects, &context));
        }
    }

    results.sort_by(|lhs, rhs| {
        serde_json::to_string(lhs)
            .unwrap()
            .cmp(&serde_json::to_string(rhs).unwrap())
    });
    results
}

fn materialize(
    projections: &[Projection],
    context: &IndexMap<String, Row>,
) -> IndexMap<String, LiteralValue> {
    let mut row = IndexMap::new();
    for projection in projections {
        let table_row = context
            .get(&projection.table)
            .unwrap_or_else(|| panic!("missing alias {}", projection.table));
        let value = table_row
            .get(&projection.column)
            .unwrap_or_else(|| panic!("missing column {}", projection.column));
        row.insert(projection.output_name(), value.clone());
    }
    row
}

fn join_rows(left: &[Row], right: &[Row], join: &Join) -> Vec<(Row, Row)> {
    let mut results = Vec::new();
    for left_row in left {
        let left_key = left_row
            .get(&join.on.0)
            .unwrap_or_else(|| panic!("missing join column {}", join.on.0));
        for right_row in right {
            let right_key = right_row
                .get(&join.on.1)
                .unwrap_or_else(|| panic!("missing join column {}", join.on.1));
            if left_key == right_key {
                results.push((left_row.clone(), right_row.clone()));
            }
        }
    }
    results
}

fn filter_matches(row: &Row, filter: &Filter) -> bool {
    row.get(&filter.column)
        .map(|value| filter.op.evaluate(value, &filter.value))
        .unwrap_or(false)
}
