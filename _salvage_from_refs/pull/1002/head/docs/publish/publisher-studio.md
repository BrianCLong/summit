# Publisher Studio

## UX Flow
1. **Upload** manifest and bundle.
2. **Static DP Lint** checks k-anon ≥25, ε tiers, and forbidden functions.
3. **Dynamic Fuzz** runs neighbour datasets to detect differencing leaks.
4. **Dual Sign & SLSA‑3 Attest** bundle hash with CompositeSigner.
5. **Transparency Anchor** records verification and approval events.
6. **Request Listing** for review; upon approval, template enters Marketplace.

## API Summary
- `submitTemplate(manifest, bundleBase64): Template` – upload bundle.
- `runVerification(templateId): Verification` – execute static & dynamic checks and append anchor.
- `requestListing(templateId): Listing` – create listing candidate.
- `approveListing(listingId): Listing` – approve and anchor; catalog updated.
