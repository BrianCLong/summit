import os
from datetime import datetime
from typing import List, Dict, Optional

import requests
from fuzzywuzzy import fuzz


Indicator = Dict[str, str]


def normalize_indicator(value: str, indicator_type: str, source: str) -> Indicator:
  """Return a normalized indicator with tagging information."""
  return {
    "value": value,
    "type": indicator_type,
    "source": source,
    "fetched_at": datetime.utcnow().isoformat()
  }


def match_indicator(value: str, existing: List[str], threshold: int = 85) -> Optional[str]:
  """Return the best fuzzy match for ``value`` from ``existing``."""
  best = None
  best_score = 0
  for candidate in existing:
    score = fuzz.ratio(value.lower(), candidate.lower())
    if score > best_score and score >= threshold:
      best = candidate
      best_score = score
  return best


def fetch_otx_indicators(limit: int = 10) -> List[Indicator]:
  """Fetch indicators from AlienVault OTX."""
  api_key = os.getenv("OTX_API_KEY")
  url = "https://otx.alienvault.com/api/v1/indicators/export"
  headers = {"X-OTX-API-KEY": api_key} if api_key else {}
  params = {"limit": limit}
  try:
    resp = requests.get(url, headers=headers, params=params, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    indicators = []
    for item in data.get("indicators", []):
      indicators.append(normalize_indicator(item.get("indicator"), item.get("type", "unknown"), "alienvault_otx"))
    return indicators
  except Exception:
    return []


def fetch_misp_indicators() -> List[Indicator]:
  """Fetch indicators from MISP instance."""
  url = os.getenv("MISP_URL")
  api_key = os.getenv("MISP_API_KEY")
  if not url or not api_key:
    return []
  headers = {"Authorization": api_key, "Accept": "application/json"}
  try:
    resp = requests.get(f"{url}/attributes/restSearch/download", headers=headers, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    indicators = []
    for attr in data.get("Attribute", []):
      indicators.append(normalize_indicator(attr.get("value"), attr.get("type", "unknown"), "misp"))
    return indicators
  except Exception:
    return []


def fetch_shodan_indicators(query: str = "org:Google") -> List[Indicator]:
  """Fetch indicators from Shodan search results."""
  api_key = os.getenv("SHODAN_API_KEY")
  if not api_key:
    return []
  url = "https://api.shodan.io/shodan/host/search"
  params = {"key": api_key, "query": query}
  try:
    resp = requests.get(url, params=params, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    indicators = []
    for match in data.get("matches", []):
      ip = match.get("ip_str")
      if ip:
        indicators.append(normalize_indicator(ip, "ip", "shodan"))
    return indicators
  except Exception:
    return []

