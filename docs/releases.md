
## Release Bundle Action

The release logic has been consolidated into a composite action located at `.github/actions/release-bundle`.

### Usage

This action standardizes the release process by:
1. Validating preflight checks (image existence, digests)
2. Enforcing freeze policies (unless overridden)
3. Classifying tags (GA vs RC) and resolving previous tags
4. Generating comprehensive evidence bundles (SBOMs, signatures, logs)
5. Verifying the evidence bundle manifest

**Example Usage in Workflow:**

```yaml
      - name: Create Release Bundle
        id: bundle
        uses: ./.github/actions/release-bundle
        with:
          tag: ${{ github.ref_name }}
          dry_run: false
          # override_freeze: true
          # override_reason: "Hotfix for security issue"

      - name: Publish Release
        uses: softprops/action-gh-release@v2
        with:
          files: ${{ steps.bundle.outputs.bundle_path }}
          prerelease: ${{ steps.bundle.outputs.channel == 'rc' }}
```
