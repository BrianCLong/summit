# Archived / Disabled Helm Manifests

The files in this directory are reference manifests that are not rendered as part of the chart. They used to live under `templates/` with a `.disabled` suffix, which broke `helm lint`. Moving them here keeps the history while allowing linting to run without workarounds.

If you revive one of these manifests, move it back under `templates/` and give it a normal `.yaml` extension.
