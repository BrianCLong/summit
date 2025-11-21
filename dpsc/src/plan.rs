use serde::{Deserialize, Serialize};

use crate::annotation::DPAnnotation;
use crate::ledger::PrivacyLedger;
use crate::noise::{AggregationKind, Mechanism, NoiseParameters};
use crate::testing::TestStub;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "strategy", rename_all = "snake_case")]
pub enum NoiseInjection {
    Direct {
        parameters: NoiseParameters,
        variance: f64,
    },
    Average {
        sum: Box<NoisePlan>,
        count: Box<NoisePlan>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NoisePlan {
    pub target: String,
    pub aggregation: AggregationKind,
    pub mechanism: Mechanism,
    pub injection: NoiseInjection,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RewrittenQuery {
    pub sql: String,
    pub noise: Vec<NoisePlan>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CompilationArtifacts {
    pub annotation: DPAnnotation,
    pub rewritten: RewrittenQuery,
    pub ledger: PrivacyLedger,
    pub test_stubs: Vec<TestStub>,
}
