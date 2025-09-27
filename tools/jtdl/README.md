# Jurisdictional Taxonomy Diff Linter (JTDL)

JTDL validates regulatory taxonomy updates against the repository by flagging code and policy hotspots in deterministic scopes:

- **Rules** – enforcement logic and policy bundles
- **Schemas** – data and contract schema definitions
- **Prompts** – generation and moderation prompts that mention regulated classes
- **Contracts** – agreements and DPA language referencing retention or lawful bases

The tool compares a baseline taxonomy JSON file with an updated version, generates a signed impact report, and produces a PR-ready comment summarizing recommended fixes.

## Usage

```bash
node dist/index.js lint \
  --baseline path/to/baseline.json \
  --updated path/to/update.json \
  --repo /path/to/repo \
  --output impact-report.json \
  --pr-comment pr-comment.md
```

To verify a signed report:

```bash
node dist/index.js verify --report impact-report.json
```

By default, JTDL signs reports with the `summit-jtdl-dev` key ID. Provide `JTDL_SIGNING_KEY`/`JTDL_KEY_ID` or pass `--key`/`--key-id` to override.

## Development

```bash
cd tools/jtdl
npm install
npm run build
```

Run repository tests to execute the deterministic hotspot test suite:

```bash
npm test -- jtdl
```
