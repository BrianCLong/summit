from typing import List, Set
from summit.vuln.types import Aliases

def stitch_aliases(existing: Aliases, new_aliases: List[str]) -> Aliases:
    """Stitches new aliases into an existing Aliases object, ensuring uniqueness."""

    # We use sets for de-duplication
    cves = set(existing.cve)
    ghsas = set(existing.ghsa)
    osvs = set(existing.osv)
    vendors = set(existing.vendor)

    for alias in new_aliases:
        if alias.startswith("CVE-"):
            cves.add(alias)
        elif alias.startswith("GHSA-"):
            ghsas.add(alias)
        elif alias.startswith("OSV-"):
            osvs.add(alias)
        else:
            vendors.add(alias)

    return Aliases(
        cve=sorted(list(cves)),
        ghsa=sorted(list(ghsas)),
        osv=sorted(list(osvs)),
        vendor=sorted(list(vendors))
    )
