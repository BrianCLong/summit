---
name: 'Issue #5: Incomplete Audit Trail on User Actions'
about: Ensure all user actions, especially tag deletions, are logged for compliance
title: 'Issue #5: Incomplete Audit Trail on User Actions'
labels: 'bug, security, compliance, backend'
assignees: ''
---

**Branch**: `feature/audit-tag-deletion`

**Status**: Open

**Description**
A critical gap exists in the IntelGraph audit trail: the deletion of temporary investigative tags by users is not being recorded. This omission creates significant compliance risks, hinders forensic analysis, and compromises the traceability of user actions within the platform. All user-initiated data modifications must be logged.

**Proposed Solution**
Implement a robust logging mechanism that captures all tag deletion events, including the user who performed the action, the timestamp, and details of the deleted tag. This data should be stored in a dedicated audit log database or service.

**Code/File Layout**

```
backend/
  api/
    tags.py
  audit/
    audit_logger.py
    audit_models.py
tests/
  backend/
    test_audit_logging.py
```

**Python Stub (`audit_models.py`):**

```python
# backend/audit/audit_models.py
from datetime import datetime
from typing import Dict, Any

class AuditLogEntry:
    def __init__(self,
                 user_id: str,
                 action: str,
                 target_type: str,
                 target_id: str,
                 timestamp: datetime = None,
                 details: Dict[str, Any] = None):
        self.user_id = user_id
        self.action = action
        self.target_type = target_type
        self.target_id = target_id
        self.timestamp = timestamp if timestamp else datetime.utcnow()
        self.details = details if details is not None else {}

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "action": self.action,
            "target_type": self.target_type,
            "target_id": self.target_id,
            "timestamp": self.timestamp.isoformat(),
            "details": self.details
        }
```

**Python Stub (`audit_logger.py`):**

```python
# backend/audit/audit_logger.py
from .audit_models import AuditLogEntry
import logging
import json

# Configure a dedicated logger for audit events
audit_log = logging.getLogger("audit_log")
audit_log.setLevel(logging.INFO)

# Example: Log to a file (in a real system, this would go to a DB/message queue)
file_handler = logging.FileHandler("audit.log")
formatter = logging.Formatter('%(asctime)s - %(message)s')
file_handler.setFormatter(formatter)
audit_log.addHandler(file_handler)

async def log_audit_event(entry: AuditLogEntry):
    """
    Logs an audit event. In a production system, this would persist to a database
    or send to a dedicated audit service/message queue.
    """
    log_data = entry.to_dict()
    audit_log.info(json.dumps(log_data))
    print(f"AUDIT LOGGED: {json.dumps(log_data)}") # For immediate console feedback

# Example usage:
# from .audit_logger import log_audit_event
# from .audit_models import AuditLogEntry
# async def some_function(user_id, tag_id, tag_name):
#     # ... perform action ...
#     await log_audit_event(
#         AuditLogEntry(
#             user_id=user_id,
#             action="TAG_DELETED",
#             target_type="TAG",
#             target_id=tag_id,
#             details={"tag_name": tag_name}
#         )
#     )
```

**Python Stub (`tags.py` - Integration example):**

```python
# backend/api/tags.py
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from backend.audit.audit_logger import log_audit_event
from backend.audit.audit_models import AuditLogEntry

router = APIRouter()

# Mock database for tags
mock_tags_db: Dict[str, Dict[str, Any]] = {
    "tag-123": {"id": "tag-123", "name": "Temporary Investigation", "created_by": "user_a"},
    "tag-456": {"id": "tag-456", "name": "Review Pending", "created_by": "user_b"},
}

# Dependency to get current user (placeholder)
def get_current_user_id():
    # In a real application, this would extract user ID from JWT/session
    return "current_user_id_placeholder"

@router.delete("/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(tag_id: str, current_user_id: str = Depends(get_current_user_id)):
    """
    Deletes a tag and logs the action.
    """
    if tag_id not in mock_tags_db:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")

    deleted_tag_info = mock_tags_db.pop(tag_id)
    tag_name = deleted_tag_info.get("name", "Unknown Tag")

    # Log the tag deletion event
    await log_audit_event(
        AuditLogEntry(
            user_id=current_user_id,
            action="TAG_DELETED",
            target_type="TAG",
            target_id=tag_id,
            details={"tag_name": tag_name, "deleted_by_user": current_user_id}
        )
    )

    return {"message": "Tag deleted successfully"}

# Example: To test this, you'd make a DELETE request to /tags/tag-123
```

**Architecture Sketch (ASCII)**

```
+-------------------+
|    User Action    |
| (e.g., Delete Tag)|
+-------------------+
        | API Request
        v
+-------------------+
|  Backend API      |
| (tags.py endpoint)|
+-------------------+
        |
        | 1. Perform Data Deletion
        v
+-------------------+
|  Tag Data Store   |
| (e.g., Database)  |
+-------------------+
        |
        | 2. Trigger Audit Log
        v
+-------------------+
|  Audit Logger     |
| (audit_logger.py) |
+-------------------+
        | Persist Event
        v
+-------------------+
|  Audit Log Store  |
| (Dedicated DB/File)|
+-------------------+
```

**Sub-tasks:**

- [ ] Define a clear `AuditLogEntry` data model in `audit_models.py` to capture essential audit information (user, action, target, timestamp, details).
- [ ] Implement a dedicated `audit_logger.py` module responsible for persisting audit events. This should be decoupled from the main application logic.
- [ ] Integrate the `audit_logger` into the `tags.py` API endpoint for tag deletion.
- [ ] Ensure that the `current_user_id` is correctly extracted and passed to the audit logging function.
- [ ] Configure the audit logging mechanism to store events in a secure, immutable, and queryable location (e.g., a separate database table, a log aggregation service).
- [ ] Develop unit and integration tests (`test_audit_logging.py`) to verify that tag deletion events are correctly logged with all required details.
- [ ] Review other critical user actions across the platform to identify any other missing audit trails.
