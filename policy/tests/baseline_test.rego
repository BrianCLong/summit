package abac.authz.test

import data.abac.authz
import future.keywords.if

test_allow_read_basic if {
  authz.allow with input as {
    "subject": {
      "tenant": "tenant1",
      "roles": ["viewer"],
      "purpose": ["investigation"]
    },
    "resource": {
      "tenant": "tenant1",
      "classification": "internal"
    },
    "action": "read"
  }
}

test_deny_cross_tenant if {
  not authz.allow with input as {
    "subject": {
      "tenant": "tenant1",
      "roles": ["viewer"],
      "purpose": ["investigation"]
    },
    "resource": {
      "tenant": "tenant2",
      "classification": "internal"
    },
    "action": "read"
  }
}

test_deny_wrong_purpose if {
  not authz.allow with input as {
    "subject": {
      "tenant": "tenant1",
      "roles": ["viewer"],
      "purpose": ["marketing"]
    },
    "resource": {
      "tenant": "tenant1",
      "classification": "internal"
    },
    "action": "read"
  }
}

test_allow_write_admin if {
  authz.allow with input as {
    "subject": {
      "tenant": "tenant1",
      "roles": ["admin"],
      "purpose": ["investigation"]
    },
    "resource": {
      "tenant": "tenant1",
      "classification": "internal"
    },
    "action": "write"
  }
}

test_deny_write_viewer if {
  not authz.allow with input as {
    "subject": {
      "tenant": "tenant1",
      "roles": ["viewer"],
      "purpose": ["investigation"]
    },
    "resource": {
      "tenant": "tenant1",
      "classification": "internal"
    },
    "action": "write"
  }
}

test_allow_pii_read_admin if {
  authz.allow with input as {
    "subject": {
      "tenant": "tenant1",
      "roles": ["admin"],
      "purpose": ["investigation"]
    },
    "resource": {
      "tenant": "tenant1",
      "classification": "pii"
    },
    "action": "read"
  }
}

test_deny_pii_read_viewer if {
  not authz.allow with input as {
    "subject": {
      "tenant": "tenant1",
      "roles": ["viewer"],
      "purpose": ["investigation"]
    },
    "resource": {
      "tenant": "tenant1",
      "classification": "pii"
    },
    "action": "read"
  }
}

test_allow_get_action if {
  authz.allow with input as {
    "subject": {
      "tenant": "tenant1",
      "roles": ["viewer"],
      "purpose": ["investigation"]
    },
    "resource": {
      "tenant": "tenant1",
      "classification": "internal"
    },
    "action": "get:/api/v1/data"
  }
}
