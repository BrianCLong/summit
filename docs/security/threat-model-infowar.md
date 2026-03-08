# Threat Model: INFOWAR Module

## 1. Abuse Cases
- **Targeting Groups:** Using narrative graphs to identify and harass specific online communities.
- **Doxxing:** Circumventing redaction to leak PII.
- **Influence Operations:** Reversing narrative propagation models to optimize botnet seeding.

## 2. Controls
- **Rate Limits:** Enforce strictly on all analytics endpoints.
- **Access Control:** RBAC required for all SITREP and Evidence exports.
- **Deny-by-Default:** No output without evidence linkage.
- **Audit Trails:** Comprehensive logging of all SITREP views and exports.
