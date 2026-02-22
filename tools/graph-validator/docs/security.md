# Security

## Data Privacy
- The validator operates on **degree distributions only**.
- No node IDs or sensitive edge data are retained in the sketches or reports.
- Input data should be sanitized to contain only degrees before processing if needed, though the tool only reads the `degree` field.

## Dependencies
- Minimal dependencies (Python standard library only for core).
- No external network calls are made by the validator.

## Secrets
- The tool does not require or handle any secrets.
