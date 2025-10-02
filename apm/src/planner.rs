use indexmap::{IndexMap, IndexSet};
use sqlparser::ast::{Ident, Join, Query, SelectItem, SetExpr, Statement, TableFactor};
use sqlparser::dialect::GenericDialect;
use sqlparser::parser::Parser;

use crate::exposure;
use crate::types::{JoinStat, PlanRequest, PlanResponse, TableSpec, TaskGoal};

const EPSILON: f64 = 1e-9;

#[derive(Debug, thiserror::Error)]
pub enum PlannerError {
    #[error("SQL parsing error: {0}")]
    SqlParse(String),
    #[error("baseline query must include a SELECT statement")]
    UnsupportedStatement,
    #[error("baseline query must select from at least one table")]
    MissingFromClause,
    #[error("required column '{0}' was not found in the baseline projection")]
    UnknownRequiredColumn(String),
    #[error("unsupported table factor in FROM clause")]
    UnsupportedTableFactor,
}

#[derive(Debug, Clone)]
pub struct PlanOutcome {
    pub reduced_sql: String,
    pub exposure_delta: crate::types::ExposureDelta,
    pub achieved_accuracy: f64,
    pub removed_joins: Vec<String>,
}

impl PlanOutcome {
    pub fn into_response(self) -> PlanResponse {
        PlanResponse {
            reduced_sql: self.reduced_sql,
            exposure_delta: self.exposure_delta,
            achieved_accuracy: self.achieved_accuracy,
            removed_joins: self.removed_joins,
        }
    }
}

#[derive(Debug, Clone)]
pub(crate) struct BaselineAnalysis {
    query: Query,
    baseline_projection: Vec<SelectItem>,
    pub(crate) join_order: IndexMap<String, Join>,
    pub(crate) baseline_aliases: IndexSet<String>,
    pub(crate) base_alias: String,
}

impl BaselineAnalysis {
    pub(crate) fn parse(sql: &str) -> Result<Self, PlannerError> {
        let dialect = GenericDialect {};
        let mut statements = Parser::parse_sql(&dialect, sql)
            .map_err(|err| PlannerError::SqlParse(err.to_string()))?;
        if statements.is_empty() {
            return Err(PlannerError::UnsupportedStatement);
        }

        let statement = statements.remove(0);
        let mut query = match statement {
            Statement::Query(query) => *query,
            _ => return Err(PlannerError::UnsupportedStatement),
        };

        let (baseline_projection, join_order, baseline_aliases, base_alias) = {
            let select = match query.body.as_mut() {
                SetExpr::Select(select) => select.as_mut(),
                _ => return Err(PlannerError::UnsupportedStatement),
            };

            if select.from.is_empty() {
                return Err(PlannerError::MissingFromClause);
            }

            let first_from = select
                .from
                .first()
                .expect("FROM clause checked to be non-empty");

            let base_alias = table_factor_alias(&first_from.relation)?;

            let join_order: IndexMap<String, Join> = first_from
                .joins
                .iter()
                .map(|join| Ok((table_factor_alias(&join.relation)?, join.clone())))
                .collect::<Result<_, PlannerError>>()?;

            let mut baseline_aliases: IndexSet<String> = IndexSet::new();
            baseline_aliases.insert(base_alias.clone());
            for alias in join_order.keys() {
                baseline_aliases.insert(alias.clone());
            }

            (
                select.projection.clone(),
                join_order,
                baseline_aliases,
                base_alias,
            )
        };

        Ok(Self {
            query,
            baseline_projection,
            join_order,
            baseline_aliases,
            base_alias,
        })
    }
}

fn table_factor_alias(factor: &TableFactor) -> Result<String, PlannerError> {
    match factor {
        TableFactor::Table { name, alias, .. } => {
            if let Some(alias) = alias {
                Ok(alias.name.value.clone())
            } else {
                Ok(name.to_string())
            }
        }
        _ => Err(PlannerError::UnsupportedTableFactor),
    }
}

fn column_to_select_item(column: &str) -> Result<SelectItem, PlannerError> {
    let trimmed = column.trim();
    if trimmed.contains('(') || trimmed.contains(' ') {
        let dialect = GenericDialect {};
        let select_sql = format!("SELECT {}", trimmed);
        let mut statements = Parser::parse_sql(&dialect, &select_sql)
            .map_err(|err| PlannerError::SqlParse(err.to_string()))?;
        let statement = statements.remove(0);
        let query = match statement {
            Statement::Query(query) => *query,
            _ => return Err(PlannerError::UnsupportedStatement),
        };
        let select = match query.body.as_ref() {
            SetExpr::Select(select) => select,
            _ => return Err(PlannerError::UnsupportedStatement),
        };
        return Ok(select.projection[0].clone());
    }

    let identifiers: Vec<Ident> = trimmed
        .split('.')
        .map(|segment| Ident::new(segment.trim()))
        .collect();

    let expr = if identifiers.len() == 1 {
        sqlparser::ast::Expr::Identifier(identifiers[0].clone())
    } else {
        sqlparser::ast::Expr::CompoundIdentifier(identifiers)
    };

    Ok(SelectItem::UnnamedExpr(expr))
}

pub struct AccessPathMinimizer {
    tables: Vec<TableSpec>,
    join_stats: IndexMap<String, JoinStat>,
}

impl AccessPathMinimizer {
    pub fn new(tables: Vec<TableSpec>, joins: Vec<JoinStat>) -> Self {
        let mut join_stats = IndexMap::new();
        for stat in joins {
            join_stats.insert(stat.alias.clone(), stat);
        }
        Self { tables, join_stats }
    }

    pub fn from_request(request: &PlanRequest) -> Self {
        Self::new(request.tables.clone(), request.joins.clone())
    }

    pub fn plan(&self, baseline_sql: &str, goal: &TaskGoal) -> Result<PlanOutcome, PlannerError> {
        let mut analysis = self.analyze_baseline(baseline_sql)?;

        let baseline_projection_strings: IndexSet<String> = analysis
            .baseline_projection
            .iter()
            .map(|item| item.to_string())
            .collect();

        let mut required_columns: IndexSet<String> = IndexSet::new();
        for column in &goal.required_columns {
            let trimmed = column.trim().to_string();
            if !baseline_projection_strings.contains(&trimmed) {
                return Err(PlannerError::UnknownRequiredColumn(trimmed));
            }
            required_columns.insert(trimmed);
        }

        let mut required_aliases: IndexSet<String> = IndexSet::new();
        required_aliases.insert(analysis.base_alias.clone());
        for column in &required_columns {
            if let Some((alias, _)) = split_identifier(column) {
                required_aliases.insert(alias.to_string());
            }
        }

        let mut kept_aliases: IndexSet<String> = analysis.join_order.keys().cloned().collect();

        let mut optional_aliases: Vec<String> = analysis
            .join_order
            .keys()
            .filter(|alias| !required_aliases.contains(*alias))
            .cloned()
            .collect();

        optional_aliases.sort_by(|a, b| {
            let stat_a = self
                .join_stats
                .get(a)
                .cloned()
                .unwrap_or_else(|| JoinStat::default_for(a));
            let stat_b = self
                .join_stats
                .get(b)
                .cloned()
                .unwrap_or_else(|| JoinStat::default_for(b));
            stat_b
                .accuracy_if_removed
                .partial_cmp(&stat_a.accuracy_if_removed)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| {
                    stat_b
                        .relative_cost
                        .partial_cmp(&stat_a.relative_cost)
                        .unwrap_or(std::cmp::Ordering::Equal)
                })
                .then_with(|| a.cmp(b))
        });

        let mut removed_joins: Vec<String> = Vec::new();
        let mut achieved_accuracy = 1.0f64;

        for alias in optional_aliases {
            let stats = self
                .join_stats
                .get(&alias)
                .cloned()
                .unwrap_or_else(|| JoinStat::default_for(&alias));
            let candidate_accuracy = achieved_accuracy * stats.accuracy_if_removed;
            if candidate_accuracy + EPSILON >= goal.accuracy_target {
                achieved_accuracy = candidate_accuracy;
                kept_aliases.shift_remove(&alias);
                removed_joins.push(alias);
            }
        }

        let select = match analysis.query.body.as_mut() {
            SetExpr::Select(select) => select.as_mut(),
            _ => return Err(PlannerError::UnsupportedStatement),
        };

        if let Some(first_from) = select.from.first_mut() {
            let filtered: Vec<Join> = analysis
                .join_order
                .iter()
                .filter(|(alias, _)| kept_aliases.contains(*alias))
                .map(|(_, join)| join.clone())
                .collect();
            first_from.joins = filtered;
        }

        select.projection = required_columns
            .iter()
            .map(|column| column_to_select_item(column))
            .collect::<Result<Vec<_>, _>>()?;

        let reduced_sql = analysis.query.to_string();

        let mut reduced_aliases: IndexSet<String> = IndexSet::new();
        reduced_aliases.insert(analysis.base_alias.clone());
        for alias in &kept_aliases {
            reduced_aliases.insert(alias.clone());
        }

        let exposure_delta = exposure::delta(
            &analysis.baseline_aliases,
            &reduced_aliases,
            analysis.baseline_projection.len(),
            required_columns.len(),
            &self.tables,
        );

        Ok(PlanOutcome {
            reduced_sql,
            exposure_delta,
            achieved_accuracy,
            removed_joins,
        })
    }

    pub(crate) fn analyze_baseline(
        &self,
        baseline_sql: &str,
    ) -> Result<BaselineAnalysis, PlannerError> {
        BaselineAnalysis::parse(baseline_sql)
    }

    pub(crate) fn join_stat(&self, alias: &str) -> Option<&JoinStat> {
        self.join_stats.get(alias)
    }
}

impl From<PlanOutcome> for PlanResponse {
    fn from(value: PlanOutcome) -> Self {
        value.into_response()
    }
}

fn split_identifier(input: &str) -> Option<(&str, &str)> {
    let mut parts = input.split('.');
    let first = parts.next()?;
    let second = parts.next()?;
    Some((first, second))
}
