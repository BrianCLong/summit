
# Aurelius IP Engine & Strategic Foresight Platform

Aurelius is the strategic intelligence layer of Summit, designed to automate the discovery, protection, and forecasting of intellectual property.

## Components

### 1. IP Harvesting ("The Collector")
- **Connectors**: USPTO, ArXiv, Internal Artifacts.
- **Normalization**: Maps raw data into `Patent`, `ResearchPaper`, and `Concept` nodes in Neo4j.

### 2. Prior Art Engine
- **Embeddings**: Uses 3072-dimensional vectors (OpenAI text-embedding-3-large compatible) for semantic search.
- **Clustering**: Groups patents by semantic similarity to identify dense and sparse regions (White Space).

### 3. Invention Engine ("The Oracle")
- **Generative Logic**: Combines orthogonal concepts to solve stated problems.
- **Novelty Scoring**: Calculates cosine distance from nearest prior art cluster.
- **Draft Generation**: Produces full patent drafts including claims and abstracts.

### 4. Strategic Foresight ("Zephyrus")
- **Simulations**: Monte Carlo simulations for technology adoption and market growth.
- **Opportunity Mapping**: Identifies high-value gaps between academic research volume and commercial patent filings.

## Usage

### Ingesting Data
```bash
curl -X POST /api/aurelius/ingest/external \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"source": "USPTO", "query": "quantum memory"}'
```

### Generating an Invention
```bash
curl -X POST /api/aurelius/invention/generate \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"problem": "Latency in distributed graph DBs", "concepts": ["CRDTs", "Optical Interconnects"]}'
```

## Configuration
Ensure Neo4j Vector Indexes are created:
```cypher
CREATE VECTOR INDEX patent_embedding_index IF NOT EXISTS FOR (n:Patent) ON (n.embedding)
OPTIONS {indexConfig: {`vector.dimensions`: 3072, `vector.similarity_function`: `cosine`}}
```
