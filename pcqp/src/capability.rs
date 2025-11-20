use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use std::fmt::{Display, Formatter};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum SiloId {
    Eu,
    Us,
    Apac,
}

impl Display for SiloId {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        let label = match self {
            SiloId::Eu => "eu",
            SiloId::Us => "us",
            SiloId::Apac => "apac",
        };
        write!(f, "{}", label)
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum Residency {
    Eu,
    Us,
    Apac,
}

impl Display for Residency {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        let label = match self {
            Residency::Eu => "eu",
            Residency::Us => "us",
            Residency::Apac => "apac",
        };
        write!(f, "{}", label)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DatasetCapability {
    pub name: String,
    pub residency: Residency,
    pub columns: Vec<String>,
    pub exportable_columns: Option<Vec<String>>,
    pub size_bytes: usize,
    pub allowed_consumers: Vec<SiloId>,
}

impl DatasetCapability {
    pub fn is_column_exportable(&self, column: &str) -> bool {
        self.exportable_columns
            .as_ref()
            .map(|columns| columns.iter().any(|candidate| candidate == column))
            .unwrap_or(true)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PolicyBinding {
    pub policy_id: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SiloCapability {
    pub silo: SiloId,
    pub datasets: IndexMap<String, DatasetCapability>,
    pub policies: Vec<PolicyBinding>,
}

impl SiloCapability {
    pub fn new(
        silo: SiloId,
        datasets: Vec<DatasetCapability>,
        policies: Vec<PolicyBinding>,
    ) -> Self {
        let mut map = IndexMap::new();
        for dataset in datasets {
            map.insert(dataset.name.clone(), dataset);
        }
        Self {
            silo,
            datasets: map,
            policies,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CapabilityCatalog {
    pub silos: IndexMap<SiloId, SiloCapability>,
}

impl CapabilityCatalog {
    pub fn new(silos: Vec<SiloCapability>) -> Self {
        let mut map = IndexMap::new();
        for silo in silos {
            map.insert(silo.silo, silo);
        }
        Self { silos: map }
    }

    pub fn silo(&self, silo: &SiloId) -> Option<&SiloCapability> {
        self.silos.get(silo)
    }

    pub fn dataset(&self, dataset: &str) -> Option<(SiloId, &DatasetCapability)> {
        for (silo_id, silo) in &self.silos {
            if let Some(capability) = silo.datasets.get(dataset) {
                return Some((*silo_id, capability));
            }
        }
        None
    }
}
