# OSINT Sources

A curated list of feeds consumed by the OSINTFeedService.
The file embeds a JSON block so the service can parse it automatically.

```json
[
  {
    "name": "Open Meteo Air Quality",
    "provider": "open_meteo_air",
    "requiresApiKey": false
  },
  {
    "name": "GNews",
    "provider": "gnews_search",
    "requiresApiKey": true,
    "envKey": "GNEWS_API_KEY"
  }
]
```

Each entry corresponds to a provider defined in `ExternalAPIService`.
API keys are retrieved from KeyVault or the environment variable specified by `envKey`.
