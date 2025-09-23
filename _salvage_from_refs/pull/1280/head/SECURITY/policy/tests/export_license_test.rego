package intelgraph.tests

import data.intelgraph.retention as r
import data.intelgraph.export as e

test_export_denied_restricted { not e.allow with input as {"license":"Restricted-TOS"} }
