# DesignOS Extract Skill

**Purpose:** Consolidate design truth from code or external sources into a semantic `DESIGN.md` and Design Knowledge Graph.

## Inputs
- `source_path`: Path to scan for design tokens/components (default: `./`).
- `output_path`: Path to write `DESIGN.md` (default: `DESIGN.md`).
- `dry_run`: If true, only outputs the graph structure without writing files.

## Outputs
- `design_md`: Content of the generated `DESIGN.md`.
- `graph_nodes`: JSON representation of extracted design entities (Colors, Typography, Components).
- `evidence`: Provenance data of the extraction.

## Moats
- **Graph-Backed**: Treats design tokens as graph nodes.
- **Semantic Extraction**: Converts raw hex/pixels into semantic names (e.g., `primary-500`, `spacing-md`).
