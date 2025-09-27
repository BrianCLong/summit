use std::path::Path;

use crate::engine::ExecutionEngine;
use crate::error::{AqlError, Result};
use crate::models::{ExecutionResult, QueryPlan};

#[derive(Default)]
pub struct Verifier {
    engine: ExecutionEngine,
}

impl Verifier {
    pub fn new() -> Self {
        Self {
            engine: ExecutionEngine::new(),
        }
    }

    pub fn replay<P: AsRef<Path>>(
        &self,
        plan: QueryPlan,
        fixtures_dir: P,
    ) -> Result<ExecutionResult> {
        self.engine.execute(plan, fixtures_dir)
    }

    pub fn verify<P: AsRef<Path>>(
        &self,
        plan: QueryPlan,
        fixtures_dir: P,
        expected: &ExecutionResult,
    ) -> Result<()> {
        let mut actual = self.replay(plan, fixtures_dir)?;
        let mut expected_cloned = expected.clone();
        actual.canonicalize();
        expected_cloned.canonicalize();
        if actual.records == expected_cloned.records && actual.trace == expected_cloned.trace {
            Ok(())
        } else {
            Err(AqlError::Verification(
                "execution results diverged from expected provenance".to_string(),
            ))
        }
    }
}
