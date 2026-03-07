# IntelGraph Pattern Mining Standards

## Overview
Pattern-miner logic must be formalized as reusable, parameterizable graph-analytics templates.
This ensures standard and stable outputs for intelligence workflows and investigations.

## Template Requirements
- There must be a minimum of 20 reusable templates.
- **Provenance metadata:** Each template output must contain explicit provenance detailing how the pattern was discovered.
- **Sharing metadata:** Each template should carry shareability metadata to describe where and with whom its findings can be shared.
- **Parameter panel schemas:** Each template must declare its parameters cleanly to be presented in standard parameter panels (e.g. `seed_entities`, `time_window`).
