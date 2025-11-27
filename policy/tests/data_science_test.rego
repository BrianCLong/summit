package intelgraph.authz

test_data_scientist_can_read_dataset {
    allow with input as {
        "subject": {"role": "data_scientist"},
        "action": "read",
        "resource": {"type": "dataset"}
    }
}

test_data_scientist_can_deploy_staging {
    allow with input as {
        "subject": {"role": "data_scientist"},
        "action": "deploy",
        "resource": {"type": "ml_model", "environment": "staging"}
    }
}

test_data_scientist_cannot_deploy_prod {
    not allow with input as {
        "subject": {"role": "data_scientist"},
        "action": "deploy",
        "resource": {"type": "ml_model", "environment": "production"}
    }
}
