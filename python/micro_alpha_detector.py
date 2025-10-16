"""Micro alpha signal detection pipeline.

This module ingests news and social data, performs sentiment and entity
analysis, correlates events with asset price moves and outputs ranked
signals with confidence intervals.

The implementation keeps external API calls minimal so the core logic can
be tested offline. Ingestors should be extended with real credentials when
used in production.
"""

from __future__ import annotations

import json
import re
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta

import feedparser
import nltk
import numpy as np
import pandas as pd
import requests
from nltk.sentiment import SentimentIntensityAnalyzer

nltk.download("vader_lexicon", quiet=True)


@dataclass
class NewsItem:
    """Representation of a news or social post mentioning financial assets."""

    timestamp: datetime
    text: str
    symbols: list[str]


class BaseIngestor:
    """Base class for news/twitter/rss ingestors."""

    def fetch(self) -> Sequence[NewsItem]:
        raise NotImplementedError


class NewsAPIIngestor(BaseIngestor):
    """Fetch news articles from the NewsAPI service."""

    def __init__(self, api_key: str, query: str = "stocks"):
        self.api_key = api_key
        self.query = query

    def fetch(self) -> Sequence[NewsItem]:
        url = "https://newsapi.org/v2/everything"
        params = {"q": self.query, "apiKey": self.api_key, "language": "en"}
        res = requests.get(url, params=params, timeout=10)
        data = res.json()
        items: list[NewsItem] = []
        for art in data.get("articles", []):
            timestamp = datetime.fromisoformat(art["publishedAt"].replace("Z", "+00:00"))
            text = f"{art.get('title', '')}. {art.get('description', '')}"
            symbols = extract_entities(text)
            items.append(NewsItem(timestamp=timestamp, text=text, symbols=symbols))
        return items


class RSSIngestor(BaseIngestor):
    """Ingest RSS feeds."""

    def __init__(self, feed_url: str):
        self.feed_url = feed_url

    def fetch(self) -> Sequence[NewsItem]:
        parsed = feedparser.parse(self.feed_url)
        items: list[NewsItem] = []
        for entry in parsed.entries:
            timestamp = (
                datetime(*entry.published_parsed[:6])
                if entry.get("published_parsed")
                else datetime.utcnow()
            )
            text = entry.get("title", "")
            symbols = extract_entities(text)
            items.append(NewsItem(timestamp=timestamp, text=text, symbols=symbols))
        return items


class TwitterIngestor(BaseIngestor):
    """Fetch tweets using Twitter API v2."""

    def __init__(self, bearer_token: str, query: str = "(stock OR stocks) -is:retweet"):
        self.bearer_token = bearer_token
        self.query = query

    def fetch(self) -> Sequence[NewsItem]:
        url = "https://api.twitter.com/2/tweets/search/recent"
        headers = {"Authorization": f"Bearer {self.bearer_token}"}
        params = {"query": self.query, "tweet.fields": "created_at"}
        res = requests.get(url, headers=headers, params=params, timeout=10)
        data = res.json()
        items: list[NewsItem] = []
        for tw in data.get("data", []):
            timestamp = datetime.fromisoformat(tw["created_at"].replace("Z", "+00:00"))
            text = tw.get("text", "")
            symbols = extract_entities(text)
            items.append(NewsItem(timestamp=timestamp, text=text, symbols=symbols))
        return items


class MicroAlphaDetector:
    """High level pipeline orchestrating ingestion and signal generation."""

    def __init__(self, ingestors: Iterable[BaseIngestor]):
        self.ingestors = ingestors
        self.sia = SentimentIntensityAnalyzer()

    def ingest(self) -> list[NewsItem]:
        items: list[NewsItem] = []
        for ing in self.ingestors:
            try:
                items.extend(ing.fetch())
            except Exception:
                continue
        return items

    def analyze(
        self,
        news: Sequence[NewsItem],
        price_df: pd.DataFrame,
        horizon: timedelta = timedelta(minutes=30),
    ) -> list[Signal]:
        """Compute sentiment and correlate with price moves."""
        signals: list[Signal] = []
        price_df = price_df.sort_values("timestamp")
        for item in news:
            sentiment = self.sia.polarity_scores(item.text)["compound"]
            for symbol in item.symbols:
                subset = price_df[price_df["symbol"] == symbol]
                before = subset[subset["timestamp"] <= item.timestamp].tail(1)
                after = subset[subset["timestamp"] >= item.timestamp + horizon].head(1)
                if before.empty or after.empty:
                    continue
                ret = (after["price"].iat[0] - before["price"].iat[0]) / before["price"].iat[0]
                signals.append(
                    {"time": item.timestamp, "asset": symbol, "sentiment": sentiment, "ret": ret}
                )
        if not signals:
            return []
        df = pd.DataFrame(signals)
        results: list[Signal] = []
        for asset, grp in df.groupby("asset"):
            corr = grp["sentiment"].corr(grp["ret"])
            n = len(grp)
            if np.isnan(corr) or n < 3:
                continue
            z = np.arctanh(corr)
            se = 1 / np.sqrt(n - 3) if n > 3 else float("inf")
            ci_low = np.tanh(z - 1.96 * se)
            ci_high = np.tanh(z + 1.96 * se)
            results.append(
                Signal(
                    time=grp["time"].iloc[-1],
                    asset=asset,
                    strength=corr,
                    confidence_low=ci_low,
                    confidence_high=ci_high,
                )
            )
        results.sort(key=lambda s: abs(s.strength), reverse=True)
        return results

    @staticmethod
    def to_json(signals: Sequence[Signal]) -> str:
        return json.dumps([s.__dict__ for s in signals], default=str)

    @staticmethod
    def to_csv(signals: Sequence[Signal], path: str) -> None:
        pd.DataFrame([s.__dict__ for s in signals]).to_csv(path, index=False)


@dataclass
class Signal:
    time: datetime
    asset: str
    strength: float
    confidence_low: float
    confidence_high: float


def extract_entities(text: str) -> list[str]:
    """Very small helper using uppercase words as tickers."""
    return re.findall(r"\b[A-Z]{2,5}\b", text)


__all__ = [
    "NewsItem",
    "Signal",
    "BaseIngestor",
    "NewsAPIIngestor",
    "RSSIngestor",
    "TwitterIngestor",
    "MicroAlphaDetector",
    "extract_entities",
]
