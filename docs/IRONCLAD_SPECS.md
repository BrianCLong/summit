# Project Ironclad: Air-Gap Deployment Specification

## Vision
"Deploy Anywhere, Trust Everywhere."
Project Ironclad ensures Summit can be deployed in completely disconnected environments (SCIFs, submarines, disaster zones) without requiring internet access for build steps, dependency fetching, or container pulling.

## The Summit Offline Bundle (SOB)
The core deliverable is a single artifact: `summit-offline-vX.Y.Z.tar.gz`.

### Bundle Structure
```
summit-offline-v1.0.0/
├── manifest.json             # Metadata (version, hash, build date)
├── install.sh                # Interactive installation script
├── docker-compose.offline.yml # Modified compose file using local images
├── images/
│   ├── summit-api.tar        # Pre-built API server
│   ├── summit-web.tar        # Pre-built Web client
│   ├── postgres.tar          # Vendor: postgres:16-alpine
│   ├── redis.tar             # Vendor: redis:7-alpine
│   ├── neo4j.tar             # Vendor: neo4j:5.24.0-community
│   ├── elasticsearch.tar     # Vendor: elasticsearch:8.15.0
│   └── ...                   # Other service images
├── configs/
│   ├── .env.example          # Template for environment variables
│   └── ...                   # Config maps if needed
└── docs/
    └── DEPLOY.md             # Offline deployment guide
```

## Technical Constraints & Solutions

### 1. Build-Time Dependencies (npm/pip)
**Problem:** `npm install` and `pip install` fail offline.
**Solution:** We shift the build process to the "Supply Chain" phase. The `summit-api` and `summit-web` images are built on a connected CI/CD runner. The resulting Docker images contain all `node_modules` and compiled binaries. The end-user never runs `npm install`.

### 2. Binary Downloads (Puppeteer, Sharp)
**Problem:** Packages like `puppeteer`, `sharp`, and `ffmpeg-static` often use `postinstall` scripts to download binaries from S3/GitHub.
**Solution:**
*   **Puppeteer:** We set `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` and install Chromium via system packages (`apk add chromium`) in the Dockerfile.
*   **Sharp:** We ensure the build environment installs `vips-dev` so Sharp builds from source, or we vendor the correct platform binary.
*   **FFmpeg:** We use the `ffmpeg-static` package which should bundle the binary, or install `ffmpeg` via `apk`.

### 3. Database Migrations
**Problem:** `npm run migrate` might try to compile TS on the fly using `ts-node`, which is fine if `node_modules` are present, but robust deployments should run compiled JS.
**Solution:** The `summit-api` image must include the built `dist/` directory and the migration scripts. The entrypoint uses `node dist/scripts/migrate.js` instead of `ts-node`.

## Release Workflow
1.  **CI Build:** GitHub Actions (or local dev) runs `scripts/build_offline_bundle.sh`.
2.  **Artifact Gen:** Script builds Docker images, saves them to `.tar`, and packages the bundle.
3.  **Transport:** USB drive or secure file transfer to air-gap zone.
4.  **Install:** User runs `./install.sh`. Script performs `docker load < images/*.tar` and `docker compose up`.

## Future Improvements
*   **Helm Chart Support:** Bundle a `.tgz` Helm chart and all container images for K8s air-gap.
*   **Verifiable Builds:** Sign the `manifest.json` and all `.tar` archives with Cosign.
