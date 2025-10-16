use serde::Serialize;

use crate::planner::{AccessPathMinimizer, BaselineAnalysis, PlannerError};
use crate::types::JoinStat;

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct SimulationPoint {
    pub removed_joins: Vec<String>,
    pub achieved_accuracy: f64,
    pub estimated_cost: f64,
}

pub struct TradeoffSimulator<'a> {
    minimizer: &'a AccessPathMinimizer,
    analysis: BaselineAnalysis,
}

impl<'a> TradeoffSimulator<'a> {
    pub fn new(
        minimizer: &'a AccessPathMinimizer,
        baseline_sql: &str,
    ) -> Result<Self, PlannerError> {
        let analysis = minimizer.analyze_baseline(baseline_sql)?;
        Ok(Self {
            minimizer,
            analysis,
        })
    }

    pub fn simulate(&self) -> Vec<SimulationPoint> {
        let mut scenarios = Vec::new();
        let mut removed = Vec::new();
        let mut current_accuracy = 1.0f64;
        let mut current_cost = self.baseline_cost();

        scenarios.push(SimulationPoint {
            removed_joins: removed.clone(),
            achieved_accuracy: current_accuracy,
            estimated_cost: current_cost,
        });

        let mut optional_aliases: Vec<String> = self
            .analysis
            .join_order
            .keys()
            .filter(|alias| self.minimizer.join_stat(alias).is_some())
            .cloned()
            .collect();

        optional_aliases.sort_by(|a, b| {
            let stat_a = self.join_stat(a);
            let stat_b = self.join_stat(b);
            stat_b
                .relative_cost
                .partial_cmp(&stat_a.relative_cost)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| {
                    stat_b
                        .accuracy_if_removed
                        .partial_cmp(&stat_a.accuracy_if_removed)
                        .unwrap_or(std::cmp::Ordering::Equal)
                })
                .then_with(|| a.cmp(b))
        });

        for alias in optional_aliases {
            let stats = self.join_stat(&alias);
            current_accuracy *= stats.accuracy_if_removed;
            current_cost = (current_cost - stats.relative_cost).max(0.0);
            removed.push(alias.clone());
            scenarios.push(SimulationPoint {
                removed_joins: removed.clone(),
                achieved_accuracy: current_accuracy,
                estimated_cost: current_cost,
            });
        }

        scenarios
    }

    fn join_stat(&self, alias: &str) -> JoinStat {
        self.minimizer
            .join_stat(alias)
            .cloned()
            .unwrap_or_else(|| JoinStat::default_for(alias))
    }

    fn baseline_cost(&self) -> f64 {
        let mut cost = 1.0f64; // base table access
        for alias in self.analysis.join_order.keys() {
            cost += self.join_stat(alias).relative_cost;
        }
        cost
    }
}
