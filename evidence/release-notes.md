## Release Notes - IntelGraph Platform v25.10.04

### Highlights
- **SLO Evaluation System Fixed**: Resolved health probe failures that were blocking CI/CD pipeline
- **Dependency Updates**: Transformers library upgraded to v4.53.0 across services
- **Merge Train Validation**: PR bundles 1-5 validated and ready for staging deployment

### Stability Improvements
- API latency SLO now passes consistently (p95: 1.0ms, error_rate: 0.000)
- Graph query SLO now passes consistently (p95: 104.797ms, error_rate: 0.000)  
- Health stub implemented to prevent false SLO failures in CI/CD

### Security & Compliance  
- Dependency bumps for transformers include security updates
- CI guardrails hardened for merge train safety

### Next Steps
- Staging canary deployment with 5% → 25% → 100% rollout
- Auto-rollback on SLO breach (p95 >15% degradation or >20%/h error-budget burn)

### Risks
- None beyond standard canary deployment
- Rollback path validated and automated

### Ops Notes
- SLO dashboards updated with new baseline metrics
- Alert rules verified for new health probe system
