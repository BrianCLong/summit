# Watchlist: 8 MIT Startups to Watch in 2026

**Source**: [MIT Sloan](https://mitsloan.mit.edu/ideas-made-to-matter/mit-startups-to-watch-2026)
**Date**: Jan 26, 2026

## Overview
Extraction of 8 startups from MIT Startup Exchange Virtual Demo Day.

## Schema
Extracts to `StartupProfile.v1` (see `summit/models/startup_profile_v1.json`).

## Known Limitations
* No enrichment beyond article text.
* Funding, traction, and founders are NOT extracted (unless in text, but generally avoided per policy).
* Trust tier is `sourced`.

## Integration
See `summit/ingest/sources/mitsloan_startups2026.py`.
