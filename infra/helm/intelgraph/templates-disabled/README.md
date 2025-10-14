# Archived / Disabled Helm Manifests

These manifests are reference material and not rendered by the chart. They used to
live under `templates/` with a `.disabled` suffix, which broke `helm lint`. Keeping
them here preserves history without impacting linting.

If you need to re-enable one, move it back under `templates/` and give it a `.yaml`
extension.
