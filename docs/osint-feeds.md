# OSINT Feed Integration

The OSINT feed subsystem loads provider definitions from `osint-sources.md` and
retrieves data from external services such as weather, news and threat feeds.

**Note:** The architecture for the OSINT product is evolving. See [OSINT Data Product Architecture](architecture/OSINT_DATA_PRODUCT_ARCHITECTURE.md) for the recommended target state, including modular ingestion pipelines, data fusion, and graph model extensions.

## Configuration

1. Edit `osint-sources.md` and add or remove feed entries. Each entry maps to a
   provider in `ExternalAPIService` and may specify an `envKey` for API key
   lookup.
2. API keys are automatically fetched through `KeyVaultService`. If no key is
   stored, `OSINTFeedService` attempts acquisition from the environment.
3. Run the service by invoking `OSINTFeedService.poll(subject)` which returns
   responses from weighted sources.

## Prioritisation

`OSINTFeedService` uses sentiment analysis and stochastic weighting to pick the
most relevant feeds for a given subject. Additional modules like geospatial or
vision analysis can be supplied via the optional context argument.
