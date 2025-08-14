package graphql.authz

import future.keywords.if

test_query_allowed if {
  allow with input as {
    "method": "POST",
    "path": "/graphql",
    "query": {"operationType":"query"},
    "jwt": {"claims": {"roles": ["analyst"]}}
  }
}

test_mutation_denied_if_not_admin if {
  not allow with input as {
    "method": "POST",
    "path": "/graphql",
    "query": {"operationType":"mutation", "operationName":"createEntity"},
    "jwt": {"claims": {"roles": ["viewer"]}}
  }
}

test_field_level_secret_only_admin if {
  allow_field("secretField") with input as {
    "jwt": {"claims": {"roles": ["admin"]}}
  }
}

