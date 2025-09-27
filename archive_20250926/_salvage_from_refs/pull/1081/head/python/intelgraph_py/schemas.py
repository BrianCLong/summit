from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr


# --- Schedule Schemas ---
class ScheduleBase(BaseModel):
    graph_id: str
    analytics_type: str
    cron_schedule: str
    is_active: bool | None = True
    parameters: dict[str, Any] | None = None


class ScheduleCreate(ScheduleBase):
    pass


class ScheduleUpdate(ScheduleBase):
    graph_id: str | None = None
    analytics_type: str | None = None
    cron_schedule: str | None = None


class ScheduleInDB(ScheduleBase):
    id: int
    last_run_at: datetime | None = None
    next_run_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


# --- Subscription Schemas ---
class SubscriptionBase(BaseModel):
    user_id: str
    alert_type: str
    contact_info: str
    is_active: bool | None = True
    filters: dict[str, Any] | None = None


class SubscriptionCreate(SubscriptionBase):
    contact_info: EmailStr  # Example: enforce email format for contact_info


class SubscriptionUpdate(SubscriptionBase):
    user_id: str | None = None
    alert_type: str | None = None
    contact_info: str | None = None


class SubscriptionInDB(SubscriptionBase):
    id: int
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


# --- AlertLog Schemas ---
class AlertLogBase(BaseModel):
    schedule_id: int
    alert_type: str
    severity: str
    message: str
    details: dict[str, Any] | None = None


class AlertLogInDB(AlertLogBase):
    id: int
    triggered_at: datetime
    is_sent: bool

    class Config:
        from_attributes = True


# --- Sentiment Analysis Schema ---
class SentimentRequest(BaseModel):
    node_id: str
    node_label: str
    text: str
