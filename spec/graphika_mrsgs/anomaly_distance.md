# Anomaly Distance Metrics (MRSGS)

## Supported metrics

- **Cosine distance** between binned spectral vectors.
- **Wasserstein distance** for distributional comparison of eigenvalue spectra.
- **KL divergence** on normalized spectral histograms.

## Selection guidance

- Use cosine for fast screening; escalate to Wasserstein for high-severity paths.
- Apply KL when baseline and candidate distributions are both smoothed and non-zero.
- Calibrate thresholds per resolution tier and per topic-region baseline library entry.
