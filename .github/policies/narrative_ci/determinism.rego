package narrative_ci.determinism

import rego.v1

# Disallowed timestamp keys — walk all nested keys and flag any timestamp fields
deny contains msg if {
    [path, _] = walk(input)
    some i
    k := path[i]
    is_string(k)
    is_timestamp_key(k)
    msg := sprintf("Path %v contains a timestamp key '%v'", [path, k])
}

# Helper to check keys
is_timestamp_key(k) if {
    k in {"created_at", "updated_at", "timestamp", "generated_at", "published_at"}
    # Exception: published_at on Artifact is allowed as it's part of the content metadata
    # But usually we hash artifacts.
    # The requirement: "no timestamps in deterministic payloads".
    # Artifact.published_at is metadata about the source, not the generation time.
    # However, strict determinism might require hashing it.
    # I'll exempt published_at if it's within an Artifact object, but let's be strict for now.
    # The plan says: "timestamps only in stamp.json".
}

# Helper to check values (optional, but good practice)
# ISO8601 regex check could be added
