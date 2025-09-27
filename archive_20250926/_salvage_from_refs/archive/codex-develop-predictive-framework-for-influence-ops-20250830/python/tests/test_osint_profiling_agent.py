import pytest

from osint_threat_actor_agent import OSINTDataFetcher


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
