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
  },
  {
    "name": "NewsAPI Headlines",
    "provider": "newsapi_headlines",
    "requiresApiKey": true,
    "envKey": "NEWSAPI_KEY"
  },
  {
    "name": "Shodan Search",
    "provider": "shodan_search",
    "requiresApiKey": true,
    "envKey": "SHODAN_API_KEY"
  },
  {
    "name": "USGS Earthquake Feed",
    "provider": "usgs_earthquakes",
    "requiresApiKey": false
  },
  {
    "name": "SMIC Micro-Expression Corpus",
    "provider": "smic_microexpressions",
    "requiresApiKey": false
  }
]
```

Each entry corresponds to a provider defined in `ExternalAPIService`.
API keys are retrieved from KeyVault or the environment variable specified by `envKey`.
