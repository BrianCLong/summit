from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from intelgraph_py.database import Base

# --- Original IntelGraph Models (Placeholders - FILL IN ACTUAL FIELDS) ---
# These models are assumed to have been part of the original intelgraph_py.models
# and are required by intelgraph_py/__init__.py

class Entity(Base):
    __tablename__ = "entities"

    id = Column(String, primary_key=True, index=True) # Example: UUID or custom ID
    type = Column(String, index=True) # e.g., "Person", "Organization", "Location"
    name = Column(String, index=True)
    properties = Column(JSON, nullable=True) # Flexible JSON field for various attributes
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Add relationships if they exist in your original schema
    # For example, relationships = relationship("Relationship", ...)

class Relationship(Base):
    __tablename__ = "relationships"

    id = Column(String, primary_key=True, index=True) # Example: UUID or custom ID
    source_id = Column(String, ForeignKey("entities.id"), nullable=False)
    target_id = Column(String, ForeignKey("entities.id"), nullable=False)
    type = Column(String, index=True) # e.g., "KNOWS", "WORKS_FOR", "LOCATED_AT"
    properties = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Add relationships if they exist in your original schema
    # For example, source = relationship("Entity", foreign_keys=[source_id])

# --- New Celery/FastAPI Models ---

class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    graph_id = Column(String, index=True, nullable=False) # ID of the graph to analyze
    analytics_type = Column(String, nullable=False) # e.g., "node_clustering", "anomaly_detection"
    cron_schedule = Column(String, nullable=False) # Cron string for scheduling
    last_run_at = Column(DateTime, nullable=True)
    next_run_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    # Parameters for analytics or change detection
    parameters = Column(JSON, nullable=True)

    alerts = relationship("AlertLog", back_populates="schedule")

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False) # User ID from your auth system
    alert_type = Column(String, nullable=False) # e.g., "email", "websocket"
    contact_info = Column(String, nullable=False) # e.g., email address, websocket ID
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    # Filters for specific alerts (e.g., subscribe only to critical alerts for a specific graph)
    filters = Column(JSON, nullable=True)

class AlertLog(Base):
    __tablename__ = "alert_logs"

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=False)
    alert_type = Column(String, nullable=False) # e.g., "node_count_drift", "cluster_shift"
    severity = Column(String, nullable=False) # e.g., "info", "warning", "critical"
    message = Column(String, nullable=False)
    details = Column(JSON, nullable=True) # Detailed JSON of the anomaly
    triggered_at = Column(DateTime, server_default=func.now())
    is_sent = Column(Boolean, default=False)

    schedule = relationship("Schedule", back_populates="alerts")

class ExplanationTaskResult(Base):
    __tablename__ = "explanation_task_results"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String, unique=True, index=True, nullable=False)
    status = Column(String, nullable=False, default="PENDING") # PENDING, STARTED, SUCCESS, FAILURE
    explanation_output = Column(JSON, nullable=True) # Stores the JSON representation of ExplanationOutput
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())