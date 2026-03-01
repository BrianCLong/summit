# Air-Gapped Quickstart

## Prerequisites
1. Dedicated bootstrap node with initial internet access to download the artifact bundle.
2. An offline container registry.
3. Target Kubernetes cluster (or equivalent) matching the `sovereign-airgap` profile.

## Bootstrap Steps
1. **Download Bundle**: Download the release artifact bundle on the bootstrap node.
2. **Verify Checksums**: Ensure the downloaded `checksums.txt` matches the `summit-release.tar.gz`.
3. **Load Images**: Use `scripts/sovereign/load-images.sh` to load OCI images into the offline registry.
4. **Apply Network Policies**: Apply default deny-all egress policies.
5. **Install Stack**: Use `helm install` or Kustomize with the `sovereign-airgap` overlay.
6. **Smoke Test**: Run `scripts/sovereign/verify-install.sh`.
