use serde::{Deserialize, Serialize};
use std::cmp::Ordering;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum LiteralValue {
    Int(i64),
    String(String),
    Bool(bool),
}

impl LiteralValue {
    pub fn as_i64(&self) -> Option<i64> {
        match self {
            LiteralValue::Int(value) => Some(*value),
            _ => None,
        }
    }

    pub fn as_str(&self) -> Option<&str> {
        match self {
            LiteralValue::String(value) => Some(value.as_str()),
            _ => None,
        }
    }
}

impl From<i64> for LiteralValue {
    fn from(value: i64) -> Self {
        LiteralValue::Int(value)
    }
}

impl From<&str> for LiteralValue {
    fn from(value: &str) -> Self {
        LiteralValue::String(value.to_string())
    }
}

impl PartialOrd for LiteralValue {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for LiteralValue {
    fn cmp(&self, other: &Self) -> Ordering {
        match (self, other) {
            (LiteralValue::Int(lhs), LiteralValue::Int(rhs)) => lhs.cmp(rhs),
            (LiteralValue::String(lhs), LiteralValue::String(rhs)) => lhs.cmp(rhs),
            (LiteralValue::Bool(lhs), LiteralValue::Bool(rhs)) => lhs.cmp(rhs),
            _ => self.discriminant().cmp(&other.discriminant()),
        }
    }
}

impl LiteralValue {
    fn discriminant(&self) -> u8 {
        match self {
            LiteralValue::Int(_) => 0,
            LiteralValue::String(_) => 1,
            LiteralValue::Bool(_) => 2,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum FilterOp {
    Eq,
    Gt,
    Gte,
    Lt,
    Lte,
}

impl FilterOp {
    pub fn evaluate(&self, left: &LiteralValue, right: &LiteralValue) -> bool {
        match self {
            FilterOp::Eq => left == right,
            FilterOp::Gt => left > right,
            FilterOp::Gte => left >= right,
            FilterOp::Lt => left < right,
            FilterOp::Lte => left <= right,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Filter {
    pub table: String,
    pub column: String,
    pub op: FilterOp,
    pub value: LiteralValue,
}

impl Filter {
    pub fn table_alias(&self) -> &str {
        &self.table
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Projection {
    pub table: String,
    pub column: String,
    pub alias: Option<String>,
}

impl Projection {
    pub fn output_name(&self) -> String {
        self.alias
            .clone()
            .unwrap_or_else(|| format!("{}__{}", self.table, self.column))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TableRef {
    pub dataset: String,
    pub alias: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum JoinStrategy {
    Broadcast { build: String },
    Hash,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Join {
    pub left: String,
    pub right: String,
    pub on: (String, String),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LogicalQuery {
    pub selects: Vec<Projection>,
    pub from: Vec<TableRef>,
    pub filters: Vec<Filter>,
    pub joins: Vec<Join>,
}

impl LogicalQuery {
    pub fn find_table(&self, alias: &str) -> Option<&TableRef> {
        self.from.iter().find(|table| table.alias == alias)
    }
}
