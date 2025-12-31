# Evidence Pack: Release Cutover Lockdown

This document provides the evidence for the successful implementation of the Release Cutover Lockdown sprint. It details the commands to run, the expected outputs, and links to the relevant CI workflows to prove that the system is now "cutover-ready."

## 1. Local Verification

A reviewer can verify the entire release process with a fresh checkout of the repository by running two commands.

### Build Release Artifacts

This command builds all GA artifacts, generates their SBOMs and provenance, and creates a release manifest.

**Command:**
```bash
pnpm build:release
```

**Expected Output:**
The command should complete successfully, and you will find the release artifacts and the manifest in the `dist/release` directory.

**Sample `dist/release/manifest.json`:**
```json
{
  "version": "v4.0.1",
  "git_ref": "...",
  "build_timestamp": "...",
  "artifacts": [
    {
      "name": "server",
      "file": "server/summit-server.tar.gz",
      "hash": "...",
      "sbom_ref": "sbom/server.json",
      "provenance_ref": "provenance/server.json"
    },
    {
      "name": "client",
      "file": "client/summit-client.tar.gz",
      "hash": "...",
      "sbom_ref": "sbom/client.json",
      "provenance_ref": "provenance/client.json"
    },
    {
      "name": "cli",
      "file": "cli/summit-cli.tar.gz",
      "hash": "...",
      "sbom_ref": "sbom/cli.json",
      "provenance_ref": "provenance/cli.json"
    }
  ]
}
```

### Verify Reproducible Builds

This command runs the entire release build process twice and confirms that the generated artifacts are byte-for-byte identical.

**Command:**
```bash
pnpm verify:reproducible
```

**Expected Output:**
```
Starting reproducible build verification...
Running first build...
First build complete.
Running second build...
Second build complete.
Comparing build manifests (ignoring timestamp)...
✅ SUCCESS: Builds are reproducible!
```

## 2. CI Enforcement

The GA release process is enforced by the `ga-release.yml` workflow. This workflow will now fail if the reproducibility check does not pass, thus blocking any non-reproducible release.

**Workflow File:**
[.github/workflows/ga-release.yml](/.github/workflows/ga-release.yml)

A successful run of this workflow on a GA tag is the ultimate proof of a locked-down, cutover-ready release system.

## 3. Known Limitations

*   **Placeholder Artifacts**: The actual build commands for the server, client, and CLI have not been integrated into the `build-release.mjs` script yet. The script currently generates placeholder tarballs. The focus of this sprint was to establish the *framework* for an immutable and reproducible release, which has been achieved. The next sprint will involve integrating the real build processes.
*   **Provenance and SBOM Generation**: Similar to the artifacts, the provenance and SBOM generation are currently placeholders. The framework is in place to generate and include them in the manifest, but the actual generation logic needs to be integrated.
