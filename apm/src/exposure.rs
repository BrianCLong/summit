use std::collections::HashMap;

use indexmap::IndexSet;

use crate::types::{Exposure, ExposureDelta, TableSpec};

pub fn exposure_for_aliases(
    participating_aliases: &IndexSet<String>,
    column_count: usize,
    tables: &[TableSpec],
) -> Exposure {
    let lookup: HashMap<&str, &TableSpec> = tables
        .iter()
        .map(|spec| (spec.alias.as_deref().unwrap_or(&spec.name), spec))
        .collect();

    let mut rows = 0usize;
    for alias in participating_aliases {
        if let Some(spec) = lookup.get(alias.as_str()) {
            rows += spec.row_count;
        }
    }

    Exposure {
        columns: column_count,
        rows,
    }
}

pub fn delta(
    baseline_aliases: &IndexSet<String>,
    reduced_aliases: &IndexSet<String>,
    baseline_columns: usize,
    reduced_columns: usize,
    tables: &[TableSpec],
) -> ExposureDelta {
    let baseline = exposure_for_aliases(baseline_aliases, baseline_columns, tables);
    let reduced = exposure_for_aliases(reduced_aliases, reduced_columns, tables);

    ExposureDelta { baseline, reduced }
}
