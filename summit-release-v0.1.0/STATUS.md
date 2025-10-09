# STATUS

## Current Release

**GA**: v0.1.0 (digests pinned in docker-compose.app.yml) ![GA](https://img.shields.io/badge/release-v0.1.0-blue)

## Health

- **Known issues**: none
- **System status**: ✅ All services healthy
- **API SLO**: 99.9% ![SLO API](https://img.shields.io/badge/SLO_API-99.9%25-green)
- **SBOM**: attached ![SBOM](https://img.shields.io/badge/SBOM-attached-success)
- **Provenance**: signed ![Provenance](https://img.shields.io/badge/provenance-signed-success)
- **Last updated**: 2025-10-08

## Operational Metrics

- **MTTA**: < 5 minutes (mean time to acknowledge)
- **MTTR**: < 30 minutes (mean time to resolution)
- **Oncall**: Rotating monthly (see oncall/README.md)
- **DR Drill**: Monthly (last: 2025-10-08)

## Dashboards & Monitoring

- **Grafana**: [GA Health Dashboard](http://localhost:3000/d/summit-health/summit-health) (when observability stack is running)
- **Alerts**: [Alertmanager](http://localhost:9093/) (when observability stack is running)
- **Logs**: Access via `make logs` or Loki when enabled

## Support

- **Issues**: [GitHub Issues](https://github.com/BrianCLong/summit/issues)
- **Security**: security@example.com (see SECURITY.md)
- **General Support**: support@example.com (see SUPPORT.md)

## Documentation

- **Quick Start**: See README.md
- **Release Notes**: RELEASE_NOTES.md
- **Configuration**: .env.example
- **Operations**: Day-2 procedures in README.md

This status page is automatically updated with each release.