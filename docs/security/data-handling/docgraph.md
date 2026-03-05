# Data Handling: DocGraph

## Data classes
| Class | Handling |
|---|---|
| document text | transient |
| entities | persisted |
| graphs | persisted |

## Never log
* raw document text
* personal identifiers
* secrets

Retention: graphs retained, raw text discarded.
