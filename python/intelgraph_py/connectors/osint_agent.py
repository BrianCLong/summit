import asyncio
import json
import os
from typing import Any

import aiohttp
from dotenv import load_dotenv
from intelgraph_py.logger_config import logger
from intelgraph_py.storage.neo4j_store import Neo4jStore

load_dotenv()

class OSINTDataFetcher:
    """Collects OSINT information from various external services."""

    async def fetch_shodan(self, ip: str) -> dict[str, Any]:
        api_key = os.getenv("SHODAN_API_KEY")
        if not api_key:
            return {}
        url = f"https://api.shodan.io/shodan/host/{ip}?key={api_key}"
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(url) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        logger.warning(f"Shodan API returned status {response.status} for {ip}")
            except Exception as e:
                logger.error(f"Error fetching Shodan for {ip}: {e}")
            return {}

    async def fetch_virustotal(self, ip: str) -> dict[str, Any]:
        api_key = os.getenv("VT_API_KEY")
        if not api_key:
            return {}
        headers = {"x-apikey": api_key}
        url = f"https://www.virustotal.com/api/v3/ip_addresses/{ip}"
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(url, headers=headers) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        logger.warning(f"VirusTotal API returned status {response.status} for {ip}")
            except Exception as e:
                logger.error(f"Error fetching VirusTotal for {ip}: {e}")
            return {}

    async def fetch_abuseipdb(self, ip: str) -> dict[str, Any]:
        api_key = os.getenv("ABUSEIPDB_API_KEY")
        if not api_key:
            return {}
        headers = {"Key": api_key, "Accept": "application/json"}
        url = f"https://api.abuseipdb.com/api/v2/check?ipAddress={ip}&maxAgeInDays=90"
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(url, headers=headers) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        logger.warning(f"AbuseIPDB API returned status {response.status} for {ip}")
            except Exception as e:
                logger.error(f"Error fetching AbuseIPDB for {ip}: {e}")
            return {}

    async def gather(self, ip: str) -> dict[str, Any]:
        """Fetches OSINT data from all sources for a given IP."""
        results = await asyncio.gather(
            self.fetch_shodan(ip),
            self.fetch_virustotal(ip),
            self.fetch_abuseipdb(ip),
            return_exceptions=True,
        )
        combined: dict[str, Any] = {}
        sources = ["shodan", "virustotal", "abuseipdb"]
        for source, result in zip(sources, results):
            if isinstance(result, Exception):
                logger.error(f"Error gathering {source} for {ip}: {result}")
            elif isinstance(result, dict) and result:
                combined[source] = result
        return combined


class ThreatActorProfilingAgent:
    """Enriches the graph with OSINT data about threat actors."""

    def __init__(self, store: Neo4jStore, fetcher: OSINTDataFetcher | None = None) -> None:
        self.store = store
        self.fetcher = fetcher or OSINTDataFetcher()

    async def enrich_ip(self, ip: str, actor_name: str) -> dict[str, Any]:
        logger.info(f"Starting OSINT enrichment for IP: {ip}, Actor: {actor_name}")
        data = await self.fetcher.gather(ip)
        if not data:
            logger.info(f"No OSINT data retrieved for {ip}")
            return {"status": "no_data", "ip": ip}

        # Serialize data to JSON string for Neo4j storage if it's complex,
        # but Neo4j driver supports maps. Let's trust the map support but handle JSON serialization for the 'osint' property if it's a blob.
        # Ideally, we store properties on the node.
        # But here we are setting `i.osint = $data`. If $data is nested, Neo4j might complain if we don't treat it as a string or use APOC.
        # Let's stringify it for safety as "osint_blob".

        query = (
            "MERGE (i:IP {address: $ip}) "
            "MERGE (a:ThreatActor {name: $actor_name}) "
            "MERGE (a)-[:USES]->(i) "
            "SET i.last_seen = datetime(), i.osint_blob = $data_blob "
            "RETURN i.address as ip"
        )

        try:
            data_blob = json.dumps(data)
            self.store.query(query, {"ip": ip, "actor_name": actor_name, "data_blob": data_blob})
            logger.info(f"Enriched IP {ip} for actor {actor_name}")
            return {"status": "success", "ip": ip, "data": data}
        except Exception as e:
            logger.error(f"Failed to write to Neo4j: {e}")
            return {"status": "error", "message": str(e)}
