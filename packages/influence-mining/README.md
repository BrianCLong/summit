# Influence Mining

The **Influence Mining** package extracts, enriches, and ranks influence networks from multi-modal social data sources.

## Usage

```bash
npm run extract -- --input packages/influence-mining/test-data/sample-social-posts.json --output /tmp/network.json
```

The command ingests the supplied dataset, constructs the influence network, enriches it with adversarial motif detection, ranks the entities, and writes the resulting JSON network to the provided path.

## Development

- `npm run --workspace=packages/influence-mining build` – compile the TypeScript sources.
- `npm run --workspace=packages/influence-mining test` – run the Jest test-suite for the package.

The library exposes the following primary classes:

- `InfluenceNetworkExtractor`
- `RelationshipDetector`
- `GraphBuilder`
- `MotifAnalyzer`
- `DataIngester`

Refer to the tests for end-to-end examples of the extraction pipeline.
