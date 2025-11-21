"""Extension point base classes."""

from abc import ABC, abstractmethod
from typing import Any, Dict, Generic, List, Optional, TypeVar
from pydantic import BaseModel


TInput = TypeVar("TInput")
TOutput = TypeVar("TOutput")


class ExtensionPoint(ABC, Generic[TInput, TOutput]):
    """Base class for extension points."""

    def __init__(self, id: str, type: str):
        self.id = id
        self.type = type

    @abstractmethod
    async def execute(self, input: TInput) -> TOutput:
        """Execute the extension point."""
        pass


class DataSourceQuery(BaseModel):
    """Query for data source."""
    query: str
    parameters: Dict[str, Any] = {}
    limit: Optional[int] = None
    offset: Optional[int] = None


class DataSourceResult(BaseModel):
    """Result from data source."""
    data: List[Any]
    total: int
    has_more: bool
    metadata: Dict[str, Any] = {}


class DataSourceExtension(ExtensionPoint[DataSourceQuery, DataSourceResult]):
    """Extension point for data sources."""

    def __init__(self, id: str, config: Dict[str, Any]):
        super().__init__(id, "data-source")
        self.config = config

    @abstractmethod
    async def connect(self) -> None:
        """Connect to the data source."""
        pass

    @abstractmethod
    async def disconnect(self) -> None:
        """Disconnect from the data source."""
        pass

    @abstractmethod
    async def test_connection(self) -> bool:
        """Test the connection."""
        pass


class AnalyzerInput(BaseModel):
    """Input for analyzer."""
    data: Any
    data_type: str
    options: Dict[str, Any] = {}


class Insight(BaseModel):
    """Analysis insight."""
    type: str
    description: str
    confidence: float
    evidence: List[Any] = []


class Entity(BaseModel):
    """Extracted entity."""
    id: str
    type: str
    properties: Dict[str, Any] = {}


class Relationship(BaseModel):
    """Extracted relationship."""
    from_id: str
    to_id: str
    type: str
    properties: Dict[str, Any] = {}


class AnalyzerResult(BaseModel):
    """Result from analyzer."""
    insights: List[Insight]
    entities: List[Entity] = []
    relationships: List[Relationship] = []
    confidence: float
    metadata: Dict[str, Any] = {}


class AnalyzerExtension(ExtensionPoint[AnalyzerInput, AnalyzerResult]):
    """Extension point for analyzers."""

    def __init__(
        self,
        id: str,
        name: str,
        description: str,
        supported_data_types: List[str],
    ):
        super().__init__(id, "analyzer")
        self.name = name
        self.description = description
        self.supported_data_types = supported_data_types


class WorkflowInput(BaseModel):
    """Input for workflow action."""
    action: str
    parameters: Dict[str, Any]
    context: Dict[str, Any]


class WorkflowResult(BaseModel):
    """Result from workflow action."""
    success: bool
    output: Optional[Any] = None
    error: Optional[str] = None
    next_actions: List[str] = []


class WorkflowExtension(ExtensionPoint[WorkflowInput, WorkflowResult]):
    """Extension point for workflow actions."""

    def __init__(
        self,
        id: str,
        action_name: str,
        description: str,
        input_schema: Dict[str, Any],
        output_schema: Dict[str, Any],
    ):
        super().__init__(id, "workflow")
        self.action_name = action_name
        self.description = description
        self.input_schema = input_schema
        self.output_schema = output_schema
