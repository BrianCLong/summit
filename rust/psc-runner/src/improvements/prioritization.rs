use std::collections::{HashMap, HashSet};
use std::time::Duration;

// Mocked types for compilation
type ImprovementId = u64;
#[derive(Debug)]
pub struct CoreImprovement {
    pub id: ImprovementId,
}

pub struct ImprovementPrioritization {
    improvements: Vec<CoreImprovement>,
    impact_scores: HashMap<ImprovementId, f64>,
    effort_estimates: HashMap<ImprovementId, Duration>,
    dependencies: HashMap<ImprovementId, Vec<ImprovementId>>,
}

impl ImprovementPrioritization {
    pub fn get_implementation_order(&self) -> Vec<ImprovementId> {
        // Use topological sort considering dependencies and ROI
        let mut ordered = Vec::new();
        let mut visited = HashSet::new();

        for improvement in &self.improvements {
            if !visited.contains(&improvement.id) {
                self.visit_improvement(improvement.id, &mut visited, &mut ordered);
            }
        }

        ordered.reverse();
        ordered
    }

    fn visit_improvement(
        &self,
        id: ImprovementId,
        visited: &mut HashSet<ImprovementId>,
        ordered: &mut Vec<ImprovementId>,
    ) {
        visited.insert(id);

        if let Some(deps) = self.dependencies.get(&id) {
            for dep in deps {
                if !visited.contains(dep) {
                    self.visit_improvement(*dep, visited, ordered);
                }
            }
        }

        ordered.push(id);
    }
}
