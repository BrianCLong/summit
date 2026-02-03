import os
from unittest import mock

from integrity.detectors.coord_anom import Finding
from integrity.observatory.export import package_export


def test_package_export_disabled_by_default():
    findings = [Finding(detector="coord_anom", score=1.0, reason="test")]
    assert package_export(findings, {}) == {}

def test_package_export_enabled():
    findings = [Finding(detector="coord_anom", score=1.0, reason="test")]
    with mock.patch.dict(os.environ, {"INTEGRITY_OBSERVATORY_EXPORT_ENABLED": "true"}):
        bundle = package_export(findings, {"bursts": 5})
        assert bundle["version"] == 1
        assert bundle["findings_count"]["coord_anom"] == 1
        assert bundle["aggregates"]["bursts"] == 5
