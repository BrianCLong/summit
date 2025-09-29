import asyncio
import logging
import os
from typing import Any, Dict

import aiohttp
from dotenv import load_dotenv

from enrichment_service.enrichment_service import Neo4jGraph

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")


class OSINTDataFetcher:
    """Collects OSINT information from various external services."""

    async def fetch_shodan(self, ip: str) -> Dict[str, Any]:
        api_key = os.getenv("SHODAN_API_KEY")
        if not api_key:
            return {}
        url = f"https://api.shodan.io/shodan/host/{ip}?key={api_key}"
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 200:
                    return await response.json()
                return {}

    async def fetch_virustotal(self, ip: str) -> Dict[str, Any]:
        api_key = os.getenv("VT_API_KEY")
        if not api_key:
            return {}
        headers = {"x-apikey": api_key}
        url = f"https://www.virustotal.com/api/v3/ip_addresses/{ip}"
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    return await response.json()
                return {}

    async def fetch_abuseipdb(self, ip: str) -> Dict[str, Any]:
        api_key = os.getenv("ABUSEIPDB_API_KEY")
        if not api_key:
            return {}
        headers = {"Key": api_key, "Accept": "application/json"}
        url = f"https://api.abuseipdb.com/api/v2/check?ipAddress={ip}&maxAgeInDays=90"
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    return await response.json()
                return {}

    async def gather(self, ip: str) -> Dict[str, Any]:
        """Fetches OSINT data from all sources for a given IP."""
        results = await asyncio.gather(
            self.fetch_shodan(ip),
            self.fetch_virustotal(ip),
            self.fetch_abuseipdb(ip),
            return_exceptions=True,
        )
        combined: Dict[str, Any] = {}
        sources = ["shodan", "virustotal", "abuseipdb"]
        for source, result in zip(sources, results):
            if isinstance(result, dict) and result:
                combined[source] = result
        return combined


class ThreatActorProfilingAgent:
    """Enriches the graph with OSINT data about threat actors."""

    def __init__(self, graph: Neo4jGraph, fetcher: OSINTDataFetcher | None = None) -> None:
        self.graph = graph
        self.fetcher = fetcher or OSINTDataFetcher()

    async def enrich_ip(self, ip: str, actor_name: str) -> None:
        data = await self.fetcher.gather(ip)
        if not data:
            logging.info("No OSINT data retrieved for %s", ip)
            return
        if not self.graph.driver:
            logging.error("Neo4j driver is not connected.")
            return
        query = (
            "MERGE (i:IP {address: $ip}) "
            "MERGE (a:ThreatActor {name: $actor_name}) "
            "MERGE (a)-[:USES]->(i) "
            "SET i.last_seen = datetime(), i.osint = $data"
        )
        with self.graph.driver.session() as session:
            session.run(query, ip=ip, actor_name=actor_name, data=data)
            logging.info("Enriched IP %s for actor %s", ip, actor_name)


async def periodic_enrich(
    agent: ThreatActorProfilingAgent,
    ip: str,
    actor: str,
    interval_seconds: int = 3600,
) -> None:
    """Periodically enriches an IP with OSINT data."""
    while True:
        await agent.enrich_ip(ip, actor)
        await asyncio.sleep(interval_seconds)


async def main() -> None:
    load_dotenv()
    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    user = os.getenv("NEO4J_USER", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "password")

    graph = Neo4jGraph(uri, user, password)
    graph.connect()

    try:
        agent = ThreatActorProfilingAgent(graph)
        await periodic_enrich(agent, "8.8.8.8", "ExampleActor")
    finally:
        graph.close()


if __name__ == "__main__":
    asyncio.run(main())

