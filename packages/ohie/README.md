# Opt-Out Herd Immunity Estimator (OHIE)

OHIE models the impact of consent and privacy opt-outs on analytics quality. It provides:

- Sensitivity curve generation across opt-out rates using both analytical formulas and Monte Carlo simulation.
- Differential-privacy aware sampling plans that combine statistical and DP noise when estimating KPIs.
- Confidence intervals for KPI degradation under coverage loss.
- Signed risk briefs with deterministic mitigation guidance for governance reviews.

The library is designed for integration with Symphony observability workflows and powers the Opt-Out Herd Immunity panel in the UI.
