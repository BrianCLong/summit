# Cross-Modal Origin Linker (CMOL)

CMOL is a Rust core library and CLI that computes modality-specific fingerprints and assembles
provenance graphs across related assets. It provides:

- Semantic hashing for text, perceptual hashing for images, and energy-based hashing for audio/video.
- Cosine-similarity driven link analysis with deterministic provenance graph export.
- Conflict detection when C2PA, watermark, and registry claims disagree.

The accompanying TypeScript API (see `server/src/provenance/cmol`) invokes the CLI to integrate CMOL
results into the Summit platform.

## Building

```bash
cd cmol
cargo build --release
```

## CLI Usage

```bash
cat request.json | target/release/cmol
```

Where `request.json` contains an `AnalysisRequest` payload as defined in `src/lib.rs`.
