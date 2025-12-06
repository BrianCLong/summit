from pydantic import BaseModel, Field, field_validator
from typing import Dict, Any, Optional
from datetime import datetime

class IntelligenceRecord(BaseModel):
    """
    Schema for validating incoming intelligence data.
    """
    id: str
    source: str
    timestamp: datetime
    author: str
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @field_validator('content')
    def content_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Content cannot be empty')
        return v

    class Config:
        extra = "ignore" # Ignore extra fields from sources

def validate_record(record: Dict[str, Any]) -> Optional[IntelligenceRecord]:
    """
    Validates a raw record against the IntelligenceRecord schema.
    Returns the validated model or None if validation fails.
    """
    try:
        return IntelligenceRecord(**record)
    except Exception as e:
        # In a real pipeline, we would log this error to a DLQ
        print(f"Validation failed for record: {e}")
        return None
