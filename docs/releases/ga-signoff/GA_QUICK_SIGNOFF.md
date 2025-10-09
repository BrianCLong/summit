# GA Quick Sign-Off Reference — v2025.10.07

**Artifacts**
- `dist/release-manifest-v2025.10.07.yaml` — SHA256s + commits
- `dist/release-attestation-v2025.10.07.jsonld` — JSON-LD VC
- `dist/evidence-v0.3.2-mc-nightly.json` — SLO/compliance

**Verify**
```bash
make release.verify
npm run release:verify
./scripts/validate-ga.sh
```

**CI/CD**
• Tag push → artifacts generated/verified → Release uploads
• Nightly verification: 04:17 UTC / 23:17 America/Chicago (DST)

**Reference:** docs/releases/GA_SIGNOFF_PACKET.md (Appendix B)