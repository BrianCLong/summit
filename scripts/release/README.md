# Release Bundle Scripts

This directory contains scripts for creating, verifying, and validating release bundles.

## Error Handling

The scripts in this directory use a standardized error-handling system. When an error occurs, a `ReleaseBundleError` is thrown, which contains a `code` property that can be used to identify the type of error.

### Error Codes

- `INVALID_JSON`: Thrown when a JSON file fails to parse.
- `SCHEMA_INVALID`: Thrown when a file fails schema validation. The `details` property of the error will contain the AJV validation errors.
- `MISSING_FIELD`: Thrown when a required field is missing from a file (e.g., `schemaVersion` in `bundle-index.json`).
- `INVALID_ENUM`: Thrown when a field has an invalid enum value.
- `SCHEMA_MAJOR_UNSUPPORTED`: Thrown when the `schemaVersion` of a bundle is a major version that is not supported by the script.

### Example

```javascript
import { ReleaseBundleError } from "./lib/errors.mjs";

try {
  // ... run a script ...
} catch (e) {
  if (e instanceof ReleaseBundleError) {
    switch (e.code) {
      case "SCHEMA_INVALID":
        console.error("Schema validation failed:", e.details);
        break;
      case "SCHEMA_MAJOR_UNSUPPORTED":
        console.error("Unsupported bundle version:", e.message);
        break;
      default:
        console.error("An unexpected bundle error occurred:", e.message);
    }
  } else {
    console.error("An unexpected error occurred:", e.message);
  }
}
```
