use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TaskGoal {
    pub required_columns: Vec<String>,
    pub accuracy_target: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TableSpec {
    pub name: String,
    pub alias: Option<String>,
    pub row_count: usize,
    pub columns: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct JoinStat {
    pub alias: String,
    pub accuracy_if_removed: f64,
    pub relative_cost: f64,
}

impl JoinStat {
    pub fn default_for(alias: &str) -> Self {
        Self {
            alias: alias.to_string(),
            accuracy_if_removed: 1.0,
            relative_cost: 1.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Exposure {
    pub columns: usize,
    pub rows: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ExposureDelta {
    pub baseline: Exposure,
    pub reduced: Exposure,
}

impl ExposureDelta {
    pub fn column_reduction(&self) -> isize {
        self.reduced.columns as isize - self.baseline.columns as isize
    }

    pub fn row_reduction(&self) -> isize {
        self.reduced.rows as isize - self.baseline.rows as isize
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PlanRequest {
    pub baseline_sql: String,
    pub goal: TaskGoal,
    pub tables: Vec<TableSpec>,
    pub joins: Vec<JoinStat>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PlanResponse {
    pub reduced_sql: String,
    pub exposure_delta: ExposureDelta,
    pub achieved_accuracy: f64,
    pub removed_joins: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SimulationRequest {
    pub baseline_sql: String,
    pub tables: Vec<TableSpec>,
    pub joins: Vec<JoinStat>,
}
