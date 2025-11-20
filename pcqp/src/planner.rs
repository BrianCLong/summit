use crate::capability::{CapabilityCatalog, DatasetCapability, SiloId};
use crate::compliance::ComplianceTrace;
use crate::query::{Filter, FilterOp, JoinStrategy, LogicalQuery, Projection};
use indexmap::{IndexMap, IndexSet};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SiloSubplan {
    pub silo: SiloId,
    pub source_alias: String,
    pub dataset: String,
    pub pushed_projections: Vec<String>,
    pub pushed_filters: Vec<Filter>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CoordinatorPlan {
    pub join_strategy: Option<JoinStrategy>,
    pub output_projections: Vec<Projection>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct FederatedPlan {
    pub subplans: Vec<SiloSubplan>,
    pub coordinator: CoordinatorPlan,
    pub compliance: ComplianceTrace,
}

#[derive(Debug, Clone)]
pub struct PlannerConfig {
    pub broadcast_threshold_bytes: usize,
}

impl Default for PlannerConfig {
    fn default() -> Self {
        Self {
            broadcast_threshold_bytes: 256 * 1024,
        }
    }
}

pub struct Planner {
    catalog: CapabilityCatalog,
    config: PlannerConfig,
}

impl Planner {
    pub fn new(catalog: CapabilityCatalog, config: PlannerConfig) -> Self {
        Self { catalog, config }
    }

    pub fn plan(&self, query: &LogicalQuery) -> Result<FederatedPlan, PlannerError> {
        let alias_catalog = self.resolve_aliases(query)?;
        let required_columns = self.required_columns(query);
        let mut compliance = ComplianceTrace::new();

        let mut subplans = Vec::new();
        for (alias, (silo, dataset_cap)) in &alias_catalog {
            compliance.record(
                format!("policy::residency::{}", dataset_cap.residency),
                Some(*silo),
                format!(
                    "dataset {} pinned to silo {} respecting residency",
                    dataset_cap.name, silo
                ),
            );

            let mut projections: Vec<String> = required_columns
                .get(alias)
                .map(|set| set.iter().cloned().collect())
                .unwrap_or_default();
            projections.sort();

            for column in &projections {
                if !dataset_cap.columns.iter().any(|candidate| candidate == column) {
                    return Err(PlannerError::ColumnNotFound {
                        dataset: dataset_cap.name.clone(),
                        column: column.clone(),
                    });
                }
                if !dataset_cap.is_column_exportable(column) {
                    return Err(PlannerError::ColumnExportViolation {
                        dataset: dataset_cap.name.clone(),
                        column: column.clone(),
                    });
                }
                compliance.record(
                    format!("policy::egress::{}", dataset_cap.name),
                    Some(*silo),
                    format!("column {} authorized for transfer", column),
                );
            }

            let mut filters = query
                .filters
                .iter()
                .filter(|filter| filter.table_alias() == alias)
                .cloned()
                .collect::<Vec<_>>();
            filters.sort_by(|lhs, rhs| filter_sort_key(lhs).cmp(&filter_sort_key(rhs)));

            subplans.push(SiloSubplan {
                silo: *silo,
                source_alias: alias.clone(),
                dataset: dataset_cap.name.clone(),
                pushed_projections: projections,
                pushed_filters: filters,
            });
        }

        subplans.sort_by(|lhs, rhs| lhs.source_alias.cmp(&rhs.source_alias));

        let join_strategy = self.plan_join(query, &alias_catalog, &mut compliance)?;
        let coordinator = CoordinatorPlan {
            join_strategy,
            output_projections: query.selects.clone(),
        };

        Ok(FederatedPlan {
            subplans,
            coordinator,
            compliance,
        })
    }

    fn plan_join(
        &self,
        query: &LogicalQuery,
        alias_catalog: &IndexMap<String, (SiloId, DatasetCapability)>,
        compliance: &mut ComplianceTrace,
    ) -> Result<Option<JoinStrategy>, PlannerError> {
        if query.joins.is_empty() {
            return Ok(None);
        }
        if query.joins.len() > 1 {
            return Err(PlannerError::UnsupportedJoin);
        }

        let join = &query.joins[0];
        let (left_silo, left_dataset) = alias_catalog
            .get(&join.left)
            .ok_or_else(|| PlannerError::TableAliasNotFound {
                alias: join.left.clone(),
            })?;
        let (right_silo, right_dataset) = alias_catalog
            .get(&join.right)
            .ok_or_else(|| PlannerError::TableAliasNotFound {
                alias: join.right.clone(),
            })?;

        let strategy = if left_dataset.size_bytes <= self.config.broadcast_threshold_bytes
            && left_dataset.size_bytes <= right_dataset.size_bytes
        {
            JoinStrategy::Broadcast {
                build: join.left.clone(),
            }
        } else if right_dataset.size_bytes <= self.config.broadcast_threshold_bytes {
            JoinStrategy::Broadcast {
                build: join.right.clone(),
            }
        } else {
            JoinStrategy::Hash
        };

        compliance.record(
            "policy::join-strategy",
            None,
            format!(
                "join {}({}) <> {}({}) planned as {:?}",
                join.left, left_silo, join.right, right_silo, strategy
            ),
        );

        Ok(Some(strategy))
    }

    fn resolve_aliases(
        &self,
        query: &LogicalQuery,
    ) -> Result<IndexMap<String, (SiloId, DatasetCapability)>, PlannerError> {
        let mut map = IndexMap::new();
        for table in &query.from {
            let (silo, dataset_cap) = self
                .catalog
                .dataset(&table.dataset)
                .ok_or_else(|| PlannerError::DatasetNotFound {
                    dataset: table.dataset.clone(),
                })?;
            map.insert(table.alias.clone(), (silo, dataset_cap.clone()));
        }
        Ok(map)
    }

    fn required_columns(&self, query: &LogicalQuery) -> IndexMap<String, IndexSet<String>> {
        let mut map: IndexMap<String, IndexSet<String>> = IndexMap::new();
        for projection in &query.selects {
            map.entry(projection.table.clone())
                .or_default()
                .insert(projection.column.clone());
        }
        for filter in &query.filters {
            map.entry(filter.table.clone())
                .or_default()
                .insert(filter.column.clone());
        }
        for join in &query.joins {
            map.entry(join.left.clone())
                .or_default()
                .insert(join.on.0.clone());
            map.entry(join.right.clone())
                .or_default()
                .insert(join.on.1.clone());
        }
        map
    }
}

#[derive(Debug, Error)]
pub enum PlannerError {
    #[error("dataset {dataset} not found in capability catalog")]
    DatasetNotFound { dataset: String },
    #[error("column {column} not found in dataset {dataset}")]
    ColumnNotFound { dataset: String, column: String },
    #[error("column {column} cannot be exported from dataset {dataset}")]
    ColumnExportViolation { dataset: String, column: String },
    #[error("join planning supports a single join at most")]
    UnsupportedJoin,
    #[error("table alias {alias} is not present in the logical query")]
    TableAliasNotFound { alias: String },
}

fn filter_sort_key(filter: &Filter) -> (String, u8, String) {
    (
        filter.column.clone(),
        op_rank(&filter.op),
        serde_json::to_string(&filter.value).unwrap_or_default(),
    )
}

fn op_rank(op: &FilterOp) -> u8 {
    match op {
        FilterOp::Eq => 0,
        FilterOp::Gt => 1,
        FilterOp::Gte => 2,
        FilterOp::Lt => 3,
        FilterOp::Lte => 4,
    }
}
