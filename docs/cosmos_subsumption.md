# Cosmos Subsumption for Summit

## Mapping Cosmos Patterns to Summit
- Reverse proxy + HTTPS + SSO -> `GatewayPolicy` + `GatewayAdapter`
- Secure auth / identity plane -> `IdentityAdapter` + `AdminElevation`
- Privileged mgmt plane risk -> `AgentCapabilities` (Least-privilege)

## Feature Flags
- `SUMMIT_EVIDENCE=0`
- `SUMMIT_EXPOSURE_POLICY=0`
- `SUMMIT_GATEWAY_ENFORCE=0`
- `SUMMIT_IDENTITY=0`
- `SUMMIT_OBS=0`
- `SUMMIT_MARKET=0`
- `SUMMIT_SMARTSHIELD=0`

## Security Notes
Inspired by Cosmos architecture discussions around privileged operations. Summit implements these using a least-privilege agent model.
