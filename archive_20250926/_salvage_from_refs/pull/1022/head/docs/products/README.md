# Data Products & Entitlements

Data products expose persisted differential privacy templates such as counts,
sums, averages and PSI+DP joins. Each product can be licensed via an
entitlement token specifying:

- `productId`
- `tenantId`
- `roomId`
- epsilon cap and expiry
- capability scopes

Tokens are signed and validated by the server. Quotas and metering track usage
and remaining epsilon.
