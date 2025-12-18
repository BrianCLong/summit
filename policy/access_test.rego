package summit.access

import data.summit.access

test_user_admin_allowed {
  access.allow with input as {
    "actor": {
      "type": "user",
      "id": "alice",
      "roles": ["developer", "governance-admin"]
    }
  }
}

test_service_bot_allowed {
  access.allow with input as {
    "actor": {
      "type": "service",
      "id": "governance-bot",
      "roles": ["governance-bot"]
    }
  }
}

test_user_without_role_denied {
  not access.allow with input as {
    "actor": {
      "type": "user",
      "id": "bob",
      "roles": ["developer"]
    }
  }
}
