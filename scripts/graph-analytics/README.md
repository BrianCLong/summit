# Summit Graph Analytics

This directory contains standalone, runnable analytics scripts designed to derive insights from the Summit Open-Source Intelligence (OSINT) knowledge graph. These scripts compute graph size metrics, centrality metrics, community clustering, connectivity, temporal growth trends, and entity co-occurrence without modifying production code.

## Deliverables

Running the main analysis script will generate the following outputs in this directory:
- `analytics_report.json` - High-level graph size metrics, connectivity data, and temporal growth trends.
- `centrality_ranking.csv` - Entities ranked by PageRank and Betweenness centrality.
- `community_results.json` - Entity clusters discovered using the Louvain community detection algorithm, along with modularity scores.
- `co_occurrence_matrix.csv` - An entity co-occurrence frequency matrix.

## Prerequisites & Installation

Ensure you have a modern Python 3.x environment. Install the required dependencies:

```bash
pip install -r requirements.txt
```

*(Includes `networkx`, `pandas`, and `python-louvain`)*

## Usage

To generate the mock data and run the full suite of graph analytics:

```bash
python analyze_graph.py
```

## Structure

- `analyze_graph.py`: The core script that orchestrates mock generation and analytics computation. It simulates the Summit data model schema (Node, Edge with properties like `type`, `platform`, `ts`, `weight`).
