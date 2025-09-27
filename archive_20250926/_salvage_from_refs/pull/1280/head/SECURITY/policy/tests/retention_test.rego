package intelgraph.tests

import data.intelgraph.retention as r
import data.intelgraph.export as e

test_retention_pii_short { r.tier with input as {"attributes": {"sensitivity":"pii"}} == "short-30d" }
