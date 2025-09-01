[![Lint (Strict)](https://github.com/brianlong/intelgraph/actions/workflows/lint-only.yml/badge.svg)](https://github.com/brianlong/intelgraph/actions/workflows/lint-only.yml)

name: Build & Publish (Control Plane)

on:
push:
branches: [ main ]
workflow_dispatch: {}

permissions:
contents: read
packages: write
id-token: write # for cosign keyless

env:
IMAGE_NAME: ghcr.io/${{ github.repository }}/maestro-control-plane

jobs:
build:
runs-on: ubuntu-latest
steps: - uses: actions/checkout@v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            ${{ env.IMAGE_NAME }}:sha-${{ github.sha }}
            ${{ env.IMAGE_NAME }}:latest
          platforms: linux/amd64

      - name: Install cosign
        uses: sigstore/cosign-installer@v3

      - name: Sign image (keyless)
        env:
          COSIGN_EXPERIMENTAL: '1'
        run: |
          cosign sign --yes $IMAGE_NAME:sha-${{ github.sha }}

      - name: Generate SBOM (SPDX JSON)
        uses: anchore/sbom-action@v0
        with:
          image: ${{ env.IMAGE_NAME }}:sha-${{ github.sha }}
          format: spdx-json
          output-file: sbom.spdx.json

      - name: Attach SBOM as attestation
        env:
          COSIGN_EXPERIMENTAL: '1'
        run: |
          cosign attest --yes \
            --predicate sbom.spdx.json \
            --type spdx \
            $IMAGE_NAME:sha-${{ github.sha }}

      - name: Upload artifacts (SBOM)
        uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.spdx.json
