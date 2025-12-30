# Canary Targets

## Types

- Decoy domains with monitoring for DNS/HTTP/SMTP touches.
- Decoy social or platform accounts instrumented for login/message attempts.
- Decoy email addresses to detect outbound contact attempts.

## Deployment

- Generated per request and per worker; unique salts prevent reuse correlation.
- Metrics recorded on any probe; probes tied to module version and execution token.

## Policy Binding

- Canary catalog committed in kill audit record; adherence verified during audit.
