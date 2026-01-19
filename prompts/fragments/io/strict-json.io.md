I/O CONTRACT

Return a single JSON object matching the outputs.schema in metadata.

Constraints:
- Output must be valid JSON.
- Use double quotes for keys/strings.
- No trailing commentary or prose.
- If a field is required but information is missing, return an empty array/object of the correct type rather than omitting the field.
