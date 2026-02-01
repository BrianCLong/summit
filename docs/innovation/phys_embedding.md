# Universal Physics Embedding

**Status**: Experimental / Flagged OFF

## Overview
A cross-domain embedding service for physical concepts (fields, images, spectra).

## Configuration
Enable with `PHYS_EMBEDDING=1`.

## Architecture
- Uses `ScienceModelAdapter` to normalize inputs.
- Produces fixed-size embeddings (e.g., 16-dim for toy version).
