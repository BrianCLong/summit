from summit.vuln.types import Aliases
from summit.vuln.normalize.alias_stitch import stitch_aliases

def test_stitch_aliases():
    existing = Aliases(cve=["CVE-2021-0001"], ghsa=["GHSA-xxx1"])
    new_aliases = ["CVE-2021-0002", "GHSA-xxx1", "OSV-123"]

    stitched = stitch_aliases(existing, new_aliases)

    assert "CVE-2021-0001" in stitched.cve
    assert "CVE-2021-0002" in stitched.cve
    assert stitched.ghsa == ["GHSA-xxx1"]
    assert stitched.osv == ["OSV-123"]

def test_stitch_uniqueness():
    existing = Aliases(cve=["CVE-1"])
    stitched = stitch_aliases(existing, ["CVE-1", "CVE-1"])
    assert stitched.cve == ["CVE-1"]
