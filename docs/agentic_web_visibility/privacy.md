# Privacy & Governance

## Deny-by-Default

All events pass through strict privacy gates:
1. **Never-Log**: Fields matching sensitive patterns (password, token, etc.) cause the event to be rejected or the field to be dropped.
2. **URL Scrubber**: Query parameters matching sensitive keys are scrubbed.

## Attribution

Attribution is "off" by default. When enabled, it uses privacy-preserving techniques (hashing, coarse categories).
