"""
RSS/Atom News Connector for IntelGraph

Ingests news feeds and extracts entities, events, and relationships.
Supports RSS and Atom formats with deduplication and content extraction.
"""

import hashlib
import json
import logging
import re
import time
from dataclasses import dataclass
from datetime import datetime, timedelta

import feedparser
import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


@dataclass
class FeedItem:
    """Represents a single news item from an RSS/Atom feed."""

    title: str
    link: str
    description: str
    published: datetime
    author: str
    guid: str
    content: str
    categories: list[str]
    source_feed: str
    content_hash: str


class RSSNewsMapper:
    """Maps RSS/Atom news feeds to IntelGraph entities and relationships."""

    def __init__(self, config: dict = None):
        self.config = config or {}
        self.user_agent = self.config.get("user_agent", "IntelGraph RSS Connector 1.0")
        self.timeout = self.config.get("timeout_seconds", 30)
        self.verify_ssl = self.config.get("verify_ssl", True)
        self.max_content_length = self.config.get("max_content_length", 1048576)
        self.dedupe_window_hours = self.config.get("dedupe_window_hours", 24)
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": self.user_agent})

        # Deduplication cache
        self.seen_hashes: set[str] = set()
        self.processed_items: dict[str, datetime] = {}

    def fetch_feed(self, feed_url: str) -> feedparser.FeedParserDict | None:
        """Fetch and parse RSS/Atom feed."""
        try:
            logger.info(f"Fetching feed: {feed_url}")

            response = self.session.get(
                feed_url, timeout=self.timeout, verify=self.verify_ssl, stream=True
            )
            response.raise_for_status()

            # Check content length
            content_length = response.headers.get("content-length")
            if content_length and int(content_length) > self.max_content_length:
                logger.warning(f"Feed too large: {content_length} bytes")
                return None

            # Parse feed
            feed = feedparser.parse(response.content)

            if feed.bozo:
                logger.warning(f"Feed parsing issues: {feed.bozo_exception}")

            logger.info(f"Parsed {len(feed.entries)} entries from {feed_url}")
            return feed

        except Exception as e:
            logger.error(f"Failed to fetch feed {feed_url}: {e}")
            return None

    def extract_full_content(self, url: str) -> str:
        """Extract full article content from URL."""
        try:
            response = self.session.get(url, timeout=self.timeout, verify=self.verify_ssl)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, "html.parser")

            # Remove unwanted elements
            for element in soup(["script", "style", "nav", "header", "footer", "aside"]):
                element.decompose()

            # Try to find main content
            content_selectors = [
                "article",
                ".article-content",
                ".post-content",
                ".entry-content",
                ".content",
                "main",
            ]

            content = ""
            for selector in content_selectors:
                element = soup.select_one(selector)
                if element:
                    content = element.get_text(strip=True)
                    break

            # Fallback to body if no content found
            if not content:
                content = soup.body.get_text(strip=True) if soup.body else ""

            return content[:5000]  # Limit content size

        except Exception as e:
            logger.warning(f"Failed to extract content from {url}: {e}")
            return ""

    def generate_content_hash(self, title: str, link: str, description: str) -> str:
        """Generate hash for deduplication."""
        content = f"{title.strip()}{link.strip()}{description.strip()}"
        return hashlib.md5(content.encode("utf-8")).hexdigest()

    def parse_feed_item(self, entry: dict, feed_url: str, feed_info: dict) -> FeedItem | None:
        """Parse a single feed entry into a FeedItem."""
        try:
            # Extract basic fields
            title = entry.get("title", "").strip()
            link = entry.get("link", "").strip()
            description = entry.get("description", "") or entry.get("summary", "")

            if not title or not link:
                return None

            # Parse published date
            published = None
            if "published_parsed" in entry and entry.published_parsed:
                published = datetime(*entry.published_parsed[:6])
            elif "updated_parsed" in entry and entry.updated_parsed:
                published = datetime(*entry.updated_parsed[:6])
            else:
                published = datetime.now()

            # Extract author
            author = ""
            if "author" in entry:
                author = entry.author
            elif "authors" in entry and entry.authors:
                author = entry.authors[0].get("name", "")

            # Extract GUID
            guid = entry.get("id", "") or entry.get("guid", "") or link

            # Extract categories/tags
            categories = []
            if "tags" in entry:
                categories = [tag.get("term", "") for tag in entry.tags if tag.get("term")]

            # Generate content hash for deduplication
            content_hash = self.generate_content_hash(title, link, description)

            # Check for duplicates
            if content_hash in self.seen_hashes:
                logger.debug(f"Duplicate item found: {title}")
                return None

            # Clean description HTML
            if description:
                soup = BeautifulSoup(description, "html.parser")
                description = soup.get_text(strip=True)

            # Extract full content if enabled
            full_content = ""
            if self.config.get("enable_full_text_extraction", False):
                full_content = self.extract_full_content(link)

            return FeedItem(
                title=title,
                link=link,
                description=description,
                published=published,
                author=author,
                guid=guid,
                content=full_content,
                categories=categories,
                source_feed=feed_url,
                content_hash=content_hash,
            )

        except Exception as e:
            logger.warning(f"Failed to parse feed item: {e}")
            return None

    def extract_entities_from_text(self, text: str) -> list[dict]:
        """Extract potential entities from text using regex patterns."""
        entities = []

        # Email addresses
        email_pattern = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
        emails = re.findall(email_pattern, text)
        for email in emails:
            entities.append({"type": "EMAIL", "value": email.lower(), "confidence": 0.95})

        # IP addresses
        ip_pattern = r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b"
        ips = re.findall(ip_pattern, text)
        for ip in ips:
            # Basic validation
            parts = ip.split(".")
            if all(0 <= int(part) <= 255 for part in parts):
                entities.append({"type": "IP_ADDRESS", "value": ip, "confidence": 0.90})

        # Domain names
        domain_pattern = r"\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b"
        domains = re.findall(domain_pattern, text)
        for domain in domains:
            if "." in domain and not domain.startswith("."):
                entities.append({"type": "DOMAIN", "value": domain.lower(), "confidence": 0.85})

        # CVE identifiers
        cve_pattern = r"CVE-\d{4}-\d{4,7}"
        cves = re.findall(cve_pattern, text, re.IGNORECASE)
        for cve in cves:
            entities.append({"type": "VULNERABILITY", "value": cve.upper(), "confidence": 0.95})

        # Hash values (MD5, SHA1, SHA256)
        hash_patterns = {
            "MD5": r"\b[a-fA-F0-9]{32}\b",
            "SHA1": r"\b[a-fA-F0-9]{40}\b",
            "SHA256": r"\b[a-fA-F0-9]{64}\b",
        }

        for hash_type, pattern in hash_patterns.items():
            hashes = re.findall(pattern, text)
            for hash_val in hashes:
                entities.append(
                    {
                        "type": "FILE_HASH",
                        "value": hash_val.lower(),
                        "hash_type": hash_type,
                        "confidence": 0.90,
                    }
                )

        return entities

    def create_article_entity(self, item: FeedItem) -> dict:
        """Create an article entity from a feed item."""
        entity_id = f"article-{item.content_hash}"

        return {
            "type": "ARTICLE",
            "properties": {
                "id": entity_id,
                "name": item.title,
                "title": item.title,
                "description": item.description,
                "url": item.link,
                "author": item.author,
                "published_date": item.published.isoformat(),
                "guid": item.guid,
                "categories": item.categories,
                "source_feed": item.source_feed,
                "content_hash": item.content_hash,
                "full_content": item.content,
                "data_source": "RSS/Atom Feed",
                "license": "varies-by-source",
                "classification": "open-source",
                "confidence": 0.95,
                "last_updated": datetime.now().isoformat(),
                "article_type": "news",
            },
        }

    def create_extracted_entities(self, item: FeedItem, extracted: list[dict]) -> list[dict]:
        """Create entities from extracted indicators."""
        entities = []

        for ext in extracted:
            entity_id = (
                f"{ext['type'].lower()}-{hashlib.md5(ext['value'].encode()).hexdigest()[:12]}"
            )

            entity = {
                "type": ext["type"],
                "properties": {
                    "id": entity_id,
                    "name": ext["value"],
                    "value": ext["value"],
                    "confidence": ext["confidence"],
                    "first_seen": item.published.isoformat(),
                    "last_seen": item.published.isoformat(),
                    "source_article": item.link,
                    "source_feed": item.source_feed,
                    "data_source": "RSS/Atom Feed Extraction",
                    "license": "varies-by-source",
                    "classification": "open-source",
                    "last_updated": datetime.now().isoformat(),
                    "extraction_method": "regex",
                },
            }

            # Add type-specific properties
            if ext["type"] == "FILE_HASH":
                entity["properties"]["hash_type"] = ext.get("hash_type", "unknown")

            entities.append(entity)

        return entities

    def create_relationships(
        self, article_entity: dict, extracted_entities: list[dict]
    ) -> list[dict]:
        """Create relationships between article and extracted entities."""
        relationships = []

        article_id = article_entity["properties"]["id"]

        for entity in extracted_entities:
            relationship = {
                "type": "MENTIONS",
                "source_id": article_id,
                "target_id": entity["properties"]["id"],
                "properties": {
                    "relationship_type": "article_mentions_entity",
                    "confidence": 0.85,
                    "context": "news_article",
                    "data_source": "RSS/Atom Feed Extraction",
                    "created_at": datetime.now().isoformat(),
                },
            }
            relationships.append(relationship)

        return relationships

    def is_recent_enough(self, published: datetime) -> bool:
        """Check if article is within the configured time window."""
        cutoff = datetime.now() - timedelta(hours=self.dedupe_window_hours)
        return published >= cutoff

    def process_feed_items(
        self, feed: feedparser.FeedParserDict, feed_url: str
    ) -> tuple[list[dict], list[dict]]:
        """Process all items in a feed."""
        entities = []
        relationships = []

        feed_info = {
            "title": feed.feed.get("title", ""),
            "link": feed.feed.get("link", ""),
            "description": feed.feed.get("description", ""),
        }

        processed_count = 0
        for entry in feed.entries:
            try:
                item = self.parse_feed_item(entry, feed_url, feed_info)
                if not item:
                    continue

                # Skip if not recent enough
                if not self.is_recent_enough(item.published):
                    continue

                # Mark as seen
                self.seen_hashes.add(item.content_hash)

                # Create article entity
                article_entity = self.create_article_entity(item)
                entities.append(article_entity)

                # Extract entities from content
                text_content = f"{item.title} {item.description} {item.content}"
                extracted = self.extract_entities_from_text(text_content)

                if extracted:
                    # Create entities for extracted indicators
                    extracted_entities = self.create_extracted_entities(item, extracted)
                    entities.extend(extracted_entities)

                    # Create relationships
                    item_relationships = self.create_relationships(
                        article_entity, extracted_entities
                    )
                    relationships.extend(item_relationships)

                processed_count += 1

            except Exception as e:
                logger.warning(f"Failed to process feed item: {e}")
                continue

        logger.info(f"Processed {processed_count} items from feed")
        return entities, relationships


def map_rss_feeds_to_intelgraph(
    feed_urls: list[str], config: dict = None
) -> tuple[list[dict], list[dict]]:
    """
    Main function to map RSS/Atom feeds to IntelGraph format.

    Args:
        feed_urls: List of RSS/Atom feed URLs to process
        config: Configuration dictionary

    Returns:
        Tuple of (entities, relationships)
    """
    mapper = RSSNewsMapper(config)
    all_entities = []
    all_relationships = []

    for feed_url in feed_urls:
        try:
            logger.info(f"Processing feed: {feed_url}")

            # Fetch and parse feed
            feed = mapper.fetch_feed(feed_url)
            if not feed:
                continue

            # Process feed items
            entities, relationships = mapper.process_feed_items(feed, feed_url)

            all_entities.extend(entities)
            all_relationships.extend(relationships)

            # Add delay between feeds to be respectful
            time.sleep(1)

        except Exception as e:
            logger.error(f"Failed to process feed {feed_url}: {e}")
            continue

    # Add provenance metadata
    provenance = {
        "data_source": "RSS/Atom Feeds",
        "license": "varies-by-source",
        "classification": "open-source",
        "ingestion_timestamp": datetime.now().isoformat(),
        "data_quality": "medium",
        "update_frequency": "real-time",
        "retention_period": "90-days",
    }

    for entity in all_entities:
        entity["properties"]["provenance"] = provenance.copy()

    for relationship in all_relationships:
        relationship["properties"]["provenance"] = provenance.copy()

    logger.info(
        f"Successfully processed {len(all_entities)} entities and {len(all_relationships)} relationships from {len(feed_urls)} feeds"
    )

    return all_entities, all_relationships


if __name__ == "__main__":
    # Example usage for testing
    logging.basicConfig(level=logging.INFO)

    # Sample threat intelligence feeds
    test_feeds = ["https://krebsonsecurity.com/feed/", "https://isc.sans.edu/rssfeed.xml"]

    try:
        entities, relationships = map_rss_feeds_to_intelgraph(test_feeds)

        print(f"Entities: {len(entities)}")
        print(f"Relationships: {len(relationships)}")

        # Print sample entities
        for i, entity in enumerate(entities[:3]):
            print(f"\nSample Entity {i+1}:")
            print(json.dumps(entity, indent=2, default=str))

        # Print sample relationships
        for i, rel in enumerate(relationships[:3]):
            print(f"\nSample Relationship {i+1}:")
            print(json.dumps(rel, indent=2, default=str))

    except Exception as e:
        print(f"Error: {e}")
