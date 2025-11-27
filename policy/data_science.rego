package intelgraph.authz

# Data Scientist Role Policy
# Allows access to datasets and ML model lifecycle operations

allow {
    input.subject.role == "data_scientist"
    input.action == "read"
    input.resource.type == "dataset"
}

allow {
    input.subject.role == "data_scientist"
    input.action == "write"
    input.resource.type == "dataset"
    # Additional constraints can be added here, e.g., sensitivity level
}

allow {
    input.subject.role == "data_scientist"
    input.action == "read"
    input.resource.type == "ml_model"
}

allow {
    input.subject.role == "data_scientist"
    input.action == "train"
    input.resource.type == "ml_model"
}

allow {
    input.subject.role == "data_scientist"
    input.action == "evaluate"
    input.resource.type == "ml_model"
}

allow {
    input.subject.role == "data_scientist"
    input.action == "deploy"
    input.resource.type == "ml_model"
    input.resource.environment == "staging" # Can deploy to staging only
}
