# Runnability Audit 2026-02-26: Data Handling & Secrets

## Never-Log List
The following secrets and tokens MUST NEVER be logged or committed to the repository:
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GROQ_API_KEY`
- `JWT_SECRET`
- `SESSION_SECRET`
- Refresh secrets
- Database passwords

## Retention and Telemetry
- All AI keys and dev database credentials are for local development ONLY.
- No telemetry endpoints should collect these secrets.
- `.env.example` should ALWAYS use placeholders and never real tokens.

## Git Tracking Prevention
- The `.env` file and variations (`.env.*`) are strictly ignored in `.gitignore`, except for `.env.example`.
- Automated CI drift detectors will fail the build if a forbidden directory (like `.claude`, `.grok`, `.jules`) containing cached secrets is tracked by Git.
