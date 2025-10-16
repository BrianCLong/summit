import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))

from packages.cyberintel.src.modules import correlate, feeds
from packages.cyberintel.src.modules import logs as logmod

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"


def test_correlation_dns_domain():
    indicators = feeds.import_csv(FIXTURES / "feeds" / "indicators.csv")
    dns_logs = logmod.load_dns(FIXTURES / "logs" / "dns.csv")
    sightings = correlate.correlate(indicators, dns_logs)
    assert len(sightings) == 1
    sight = sightings[0]
    assert sight["indicator"]["value"] == "bad.com"
    assert sight["log"]["query"] == "bad.com"
