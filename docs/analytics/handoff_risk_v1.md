# Handoff Risk Scoring Spec (deterministic)

### Features (binary unless noted)

* `official_attribution_present`
* `official_warning_present`
* `vendor_disclosure_present`
* `multi-country_victim_scope`
* `geopolitical_salience`
* `critical_infrastructure_relevance`
* `violence_or_kinetic_event`
* `negotiation_linkage`
* `stealth_persistence_indicator`
* `targets_high_value`
* `cross-sector_targets`
* `platform_brand_salience`
* `cross-domain linkage (cyber + kinetic)`
* `attribution_specificity` (0/1)
* `evidence_completeness_penalty` (0/1)

### Score

`score = clamp(0, 100, Σ(weight_i * value_i) + base)`

* `base = 20`
* penalty weight is negative
* in this bundle, I applied completeness penalty because we only have summaries, not full texts/IOCs.

### Bands

* `0–39`: low
* `40–69`: medium
* `70–100`: high
