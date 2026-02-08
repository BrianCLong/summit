package narrative_ci.determinism

import rego.v1

# Disallowed timestamp keys
deny contains msg if {
    some path, value in walk(input)
    is_timestamp_key(path[count(path)-1])
    msg := sprintf("Path %v contains a timestamp key '%v'", [path, path[count(path)-1]])
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
