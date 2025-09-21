#!/usr/bin/env python3
"""Fetch CISA Known Exploited Vulnerabilities and emit graph-ready JSON."""
import csv
import io
import json
import urllib.request

URL = "https://www.cisa.gov/sites/default/files/csv/known_exploited_vulnerabilities.csv"


def fetch_rows(url: str = URL):
    with urllib.request.urlopen(url) as resp:
        text = resp.read().decode("utf-8", errors="ignore")
    return csv.DictReader(io.StringIO(text))


def build_graph(rows):
    nodes = []
    edges = []
    seen = set()

    def add_node(node_id, node_type, **props):
        if node_id in seen:
            return
        seen.add(node_id)
        node = {"id": node_id, "type": node_type}
        node.update(props)
        nodes.append(node)

    for row in rows:
        cve = row.get("cveID", "")
        vendor = row.get("vendorProject", "")
        product = row.get("product", "")
        vuln_id = f"vuln:{cve}"
        vendor_id = f"vendor:{vendor}"
        product_id = f"product:{vendor}:{product}"
        add_node(vuln_id, "Vulnerability", name=cve, source="CISA KEV")
        add_node(vendor_id, "Vendor", name=vendor, source="CISA KEV")
        add_node(
            product_id,
            "Product",
            name=product,
            vendor=vendor,
            source="CISA KEV",
        )
        edges.append(
            {
                "source": vendor_id,
                "target": product_id,
                "type": "PRODUCES",
                "sourceRef": "CISA KEV",
            }
        )
        edges.append(
            {
                "source": product_id,
                "target": vuln_id,
                "type": "AFFECTS",
                "sourceRef": "CISA KEV",
            }
        )
    return {"nodes": nodes, "edges": edges}


def main():
    rows = list(fetch_rows())
    graph = build_graph(rows)
    print(json.dumps(graph, indent=2))


if __name__ == "__main__":
    main()
