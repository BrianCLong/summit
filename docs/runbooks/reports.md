# Report Generation Runbook

## Overview
The Reporting Service uses Playwright to render HTML templates to PDF.

## Troubleshooting

### Render Timeouts
- **Symptom**: Job fails with "Timeout exceeded".
- **Fix**: Check if the template is trying to load external resources (blocked by sandbox). Ensure all assets are local.

### Font Issues
- **Symptom**: Squares or wrong fonts.
- **Fix**: Verify `Dockerfile` includes the font pack. Only `Noto Sans` and `Inter` are supported.

## Deployment
- Service: `services/reporting`
- Queue: `report-generation` (Redis)
