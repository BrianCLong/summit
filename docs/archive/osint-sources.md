# OSINT Sources

A curated list of feeds consumed by the OSINTFeedService.
The file embeds a JSON block so the service can parse it automatically.

```json
[
  {
    "name": "Open Meteo Air Quality",
    "provider": "open_meteo_air",
    "requiresApiKey": false,
    "quality": 0.9,
    "lastUpdated": "2025-01-01T00:00:00Z",
    "semanticDensity": 0.7
  },
  {
    "name": "GNews",
    "provider": "gnews_search",
    "requiresApiKey": true,
    "envKey": "GNEWS_API_KEY",
    "quality": 0.6,
    "lastUpdated": "2024-06-01T00:00:00Z",
    "semanticDensity": 0.8
  },
  {
    "name": "NewsAPI Headlines",
    "provider": "newsapi_headlines",
    "requiresApiKey": true,
    "envKey": "NEWSAPI_KEY",
    "quality": 0.7,
    "lastUpdated": "2024-12-15T00:00:00Z",
    "semanticDensity": 0.6
  },
  {
    "name": "Shodan Search",
    "provider": "shodan_search",
    "requiresApiKey": true,
    "envKey": "SHODAN_API_KEY",
    "quality": 0.8,
    "lastUpdated": "2024-11-01T00:00:00Z",
    "semanticDensity": 0.9
  },
  {
    "name": "USGS Earthquake Feed",
    "provider": "usgs_earthquakes",
    "requiresApiKey": false,
    "quality": 0.5,
    "lastUpdated": "2025-01-05T00:00:00Z",
    "semanticDensity": 0.4
  }
]
```

Each entry corresponds to a provider defined in `ExternalAPIService`.
API keys are retrieved from KeyVault or the environment variable specified by `envKey`.
