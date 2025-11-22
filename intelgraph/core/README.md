# IntelGraph Core - Minimal Decision & Claims Slice

**Version:** 0.1.0
**Status:** Initial Implementation
**Python:** 3.11+

## Overview

A thin, refactor-friendly knowledge graph implementation for entities, claims, decisions, and provenance with strong governance. Built for [Topicality](https://topicality.co) as part of the Summit IntelGraph platform.

## Philosophy

- **Boring, explicit code** - No clever abstractions
- **Minimal dependencies** - FastAPI, SQLModel, Pydantic, pytest
- **Type-safe** - Full type hints throughout
- **Governance-first** - Policy labels baked into the data model

## Quick Start

```bash
# From repository root
make bootstrap           # Install dependencies
make intelgraph-test     # Run tests
make intelgraph-api      # Start API server
```

API will be available at:
- http://localhost:8000 - API root
- http://localhost:8000/docs - Interactive API documentation
- http://localhost:8000/redoc - ReDoc documentation
- http://localhost:8000/health - Health check

## Documentation

See [docs/intelgraph_minimal.md](../../docs/intelgraph_minimal.md) for complete documentation.

## Project Structure

```
intelgraph/core/
├── __init__.py       # Package initialization
├── models.py         # Domain models (Entity, Claim, Decision, Source)
├── database.py       # Database abstraction layer
└── README.md         # This file

intelgraph/
├── api.py            # FastAPI application & routes
├── requirements.txt  # Python dependencies
└── pyproject.toml    # Package metadata

tests/intelgraph/
├── conftest.py       # Pytest fixtures
├── test_models.py    # Model tests
├── test_database.py  # Database tests
└── test_api.py       # API endpoint tests
```

---

**Maintainer:** Topicality Engineering Team
**Last Updated:** 2025-01-15
