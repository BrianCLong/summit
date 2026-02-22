# summit/supplychain/canary/tests/test_redirect_differential.py
import pytest
from summit.supplychain.canary.canary_runner import CanaryRunner
from summit.supplychain.canary.providers.http_probe import HttpProbe

def test_detect_differential():
    provider1 = HttpProbe(name="client_a", headers={"User-Agent": "ClientA"})
    provider2 = HttpProbe(name="client_b", headers={"User-Agent": "ClientB"})

    # Mocking different hashes for different providers
    provider2.probe = lambda url: {"artifact_hash": "sha256:different", "content_length": 1000}

    runner = CanaryRunner(providers=[provider1, provider2])
    result = runner.run_check("http://example.com/update")

    assert result["differential_detected"] is True

def test_no_differential():
    provider1 = HttpProbe(name="client_a")
    provider2 = HttpProbe(name="client_b")

    runner = CanaryRunner(providers=[provider1, provider2])
    result = runner.run_check("http://example.com/update")

    assert result["differential_detected"] is False
