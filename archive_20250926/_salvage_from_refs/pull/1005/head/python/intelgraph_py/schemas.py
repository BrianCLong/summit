from datetime import datetime
from typing import Optional, Dict, Any

from pydantic import BaseModel, EmailStr

# --- Schedule Schemas ---
class ScheduleBase(BaseModel):
    graph_id: str
    analytics_type: str
    cron_schedule: str
    is_active: Optional[bool] = True
    parameters: Optional[Dict[str, Any]] = None

class ScheduleCreate(ScheduleBase):
    pass

class ScheduleUpdate(ScheduleBase):
    graph_id: Optional[str] = None
    analytics_type: Optional[str] = None
    cron_schedule: Optional[str] = None

class ScheduleInDB(ScheduleBase):
    id: int
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Subscription Schemas ---
class SubscriptionBase(BaseModel):
    user_id: str
    alert_type: str
    contact_info: str
    is_active: Optional[bool] = True
    filters: Optional[Dict[str, Any]] = None

class SubscriptionCreate(SubscriptionBase):
    contact_info: EmailStr # Example: enforce email format for contact_info

class SubscriptionUpdate(SubscriptionBase):
    user_id: Optional[str] = None
    alert_type: Optional[str] = None
    contact_info: Optional[str] = None

class SubscriptionInDB(SubscriptionBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- AlertLog Schemas ---
class AlertLogBase(BaseModel):
    schedule_id: int
    alert_type: str
    severity: str
    message: str
    details: Optional[Dict[str, Any]] = None

class AlertLogInDB(AlertLogBase):
    id: int
    triggered_at: datetime
    is_sent: bool

    class Config:
        from_attributes = True
