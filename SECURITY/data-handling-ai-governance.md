# AI Code Governance Data Handling

**Classes:**
* `source code`: confidential
* `parsed structure`: internal
* `explanation reports`: internal
* `trust scores`: internal
* `embeddings`: sensitive-internal

**Retention:**
* `local mode`: artifacts only, user-controlled
* `hosted mode`: default 30-day artifact retention unless overridden by org policy

**Never Log:**
* raw secrets
* tokens
* credentials
* full prompt text by default
* private repo URLs
* file contents of designated sensitive paths
