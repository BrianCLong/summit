from unittest.mock import MagicMock

import pytest
from intelgraph_py.connectors.osint_agent import OSINTDataFetcher, ThreatActorProfilingAgent


@pytest.mark.asyncio
async def test_gather_combines_sources(monkeypatch):
    fetcher = OSINTDataFetcher()

    async def fake_shodan(ip: str):
        return {"shodan": True}

    async def fake_vt(ip: str):
        return {"vt": True}

    async def fake_abuse(ip: str):
        return {}

    monkeypatch.setattr(fetcher, "fetch_shodan", fake_shodan)
    monkeypatch.setattr(fetcher, "fetch_virustotal", fake_vt)
    monkeypatch.setattr(fetcher, "fetch_abuseipdb", fake_abuse)

    data = await fetcher.gather("1.2.3.4")
    assert "shodan" in data
    assert "virustotal" in data
    assert "abuseipdb" not in data

@pytest.mark.asyncio
async def test_enrich_ip_writes_to_neo4j(monkeypatch):
    mock_store = MagicMock()
    mock_fetcher = OSINTDataFetcher()

    async def fake_gather(ip: str):
        return {"shodan": {"ports": [80]}}

    monkeypatch.setattr(mock_fetcher, "gather", fake_gather)

    agent = ThreatActorProfilingAgent(store=mock_store, fetcher=mock_fetcher)

    result = await agent.enrich_ip("1.2.3.4", "TestActor")

    assert result["status"] == "success"
    mock_store.query.assert_called_once()
    args, _ = mock_store.query.call_args
    # args[0] is query string, args[1] is params dict
    assert "MERGE (i:IP {address: $ip})" in args[0]
    assert args[1]["ip"] == "1.2.3.4"
