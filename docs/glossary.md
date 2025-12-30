---
title: "Glossary"
summary: "Key Summit terms used across MVP-4 documentation."
version: "MVP-4-GA"
lastUpdated: "2025-12-30"
owner: "docs"
---

# Glossary

- **Golden path**: Standard bring-up sequence `make bootstrap && make up && make smoke`.
- **Runbook**: Executable graph defined in the GraphQL schema (`Runbook`, `Run`, `RunState`).
- **Gateway**: Policy-aware entrypoint serving GraphQL on ports 4000/8080.
- **Policy Compiler**: Service used by the gateway for policy evaluation (Compose service `policy-compiler`).
- **NLQ**: Natural-language-to-query service (`ai-nlq` in Compose) used for query translation.
- **Prov Ledger**: Provenance ledger service exposed at port 8101 in the dev compose file.

## Next steps

- For usage instructions, see [Tutorials](tutorials/first-runbook.md).
- For operational context, visit [Architecture](architecture/overview.md).
