import future.keywords
package intelgraph.authz

test_data_scientist_can_read_dataset if {
    allow with input as {
        "subject": {"role": "data_scientist"},
        "action": "read",
        "resource": {"type": "dataset"}
    }
}

test_data_scientist_can_deploy_staging if {
    allow with input as {
        "subject": {"role": "data_scientist"},
        "action": "deploy",
        "resource": {"type": "ml_model", "environment": "staging"}
    }
}

test_data_scientist_cannot_deploy_prod if {
    not allow with input as {
        "subject": {"role": "data_scientist"},
        "action": "deploy",
        "resource": {"type": "ml_model", "environment": "production"}
    }
}
