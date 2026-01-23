# Client Route Regression Gate

This document describes the process for verifying that all client-side route components exist, preventing build failures due to missing files.

## Overview

A Node.js script, `scripts/ci/verify_client_routes_exist.mjs`, has been created to statically analyze the main router configuration file (`client/src/App.router.jsx`) and ensure that all imported components correspond to actual files on the filesystem.

This gate is designed to catch errors where a route is defined but the associated component file has been deleted, moved, or incorrectly named. It checks both static `import` statements and dynamic `React.lazy(() => import(...))` calls.

## How to Run

The script can be run manually from the project root:

```bash
node scripts/ci/verify_client_routes_exist.mjs
```

### Success Output

If all imports are resolved successfully, the script will exit with code 0 and print a success message:

```
🔍 Auditing router file: /path/to/project/client/src/App.router.jsx
🔎 Found 17 unique relative imports to check...

✅ Success: All route component imports are valid.
```

### Failure Output

If any imports cannot be resolved, the script will exit with code 1 and print a list of the missing files:

```
🔍 Auditing router file: /path/to/project/client/src/App.router.jsx
🔎 Found 17 unique relative imports to check...

❌ Error: Found missing route component imports!
The following imports could not be resolved:
  - ./pages/Search/SomeMissingPage
  - ./features/SomeOtherMissingPage

Please ensure these files exist and are correctly referenced in the router.
```

## How It Works

1.  The script reads the content of `client/src/App.router.jsx`.
2.  It uses a regular expression to extract all relative import paths.
3.  For each path, it attempts to resolve the file on the filesystem, checking for `.js`, `.jsx`, `.ts`, and `.tsx` extensions.
4.  If any path cannot be resolved, it is added to a list of missing imports.
5.  If the list is not empty, the script fails; otherwise, it succeeds.
