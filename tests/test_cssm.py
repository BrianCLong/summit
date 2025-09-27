import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tools.cssm import map_sources


SAMPLE_PATH = Path("tools/cssm/samples/seeded_corpora.json")


def load_sample_systems():
    payload = json.loads(SAMPLE_PATH.read_text())
    return payload["systems"]


def index_annotations(annotations):
    return {
        (entry["source_system"], entry["source_table"], entry["field_name"]): entry
        for entry in annotations
    }


def test_seeded_corpora_maps_above_threshold():
    systems = load_sample_systems()
    result = map_sources(systems)
    annotations = index_annotations(result["schema_annotations"])

    key = ("warehouse_redshift", "orders_fact", "order_id")
    assert annotations[key]["confidence"] >= 0.85
    assert annotations[key]["canonical_target"]["name"] == "order_id"

    revenue_key = ("app_salesforce", "Account", "AnnualRevenue")
    assert annotations[revenue_key]["confidence"] >= 0.74
    assert annotations[revenue_key]["canonical_target"]["name"] == "total_revenue"

    amount_key = ("app_salesforce", "Opportunity", "Amount")
    assert annotations[amount_key]["confidence"] >= 0.6
    assert annotations[amount_key]["canonical_target"]["unit"] == "USD"


def test_compatibility_matrix_flags_incompatible_pairs():
    systems = load_sample_systems()
    result = map_sources(systems)
    matrix = result["compatibility_matrix"]

    assert any(not row["compatible"] for row in matrix)

    mismatches = [
        row
        for row in matrix
        if not row["compatible"]
        and row["left"]["canonical"] != row["right"]["canonical"]
    ]
    assert mismatches, "Expected canonical mismatches to be surfaced"


def test_mapping_is_deterministic():
    systems = load_sample_systems()
    first = map_sources(systems)
    second = map_sources(systems)
    assert first == second
