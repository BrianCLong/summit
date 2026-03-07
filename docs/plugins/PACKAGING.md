# Plugin Packaging & Distribution

## Package Format

A plugin package is a gzipped tarball (`.tgz`) or a zip file containing:

1.  `plugin.json`: The Manifest.
2.  `index.js`: The entry point (bundled/minified).
3.  `README.md`: Documentation.
4.  `assets/`: (Optional) Icons, static resources.

## Bundle Structure

```text
my-plugin-1.0.0.tgz
├── plugin.json
├── index.js
├── README.md
└── assets/
    └── icon.png
```

## Build Process

Developers should use the CLI tool to pack plugins.

```bash
summit-plugin pack ./my-plugin-source
# Generates: com.example.my-plugin-1.0.0.tgz
```

## Registry

Plugins are stored in the `PluginRegistry` (backed by PostgreSQL + Object Storage).

- **Upload**: Admins upload the `.tgz` bundle.
- **Verification**:
  - Manifest is validated.
  - Code is scanned (static analysis).
  - Signature is verified (if signed).
- **Availability**: Once verified, the plugin is available for installation by tenants.

## Versioning

We adhere to [SemVer](https://semver.org/).

- **Major**: Breaking API changes.
- **Minor**: New capabilities (backward compatible).
- **Patch**: Bug fixes.
