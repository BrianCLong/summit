# Pilot Operations Runbook

**Sector:** {{SECTOR_NAME}}
**Bundle ID:** {{BUNDLE_ID}}

## 1. Deployment
- Unpack the bundle: `tar -xzf pilot-starter_{{SECTOR}}_{{ID}}.tar.gz`
- Run the setup script: `./setup.sh` (Simulated)

## 2. Operation
- Start services: `./start.sh`
- Monitor logs: `tail -f logs/app.log`

## 3. Troubleshooting
- Check `status.json` for health.
- Review `error.log`.
