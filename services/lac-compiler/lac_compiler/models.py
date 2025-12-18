from typing import List, Optional, Dict, Any

from pydantic import BaseModel, Field


class Condition(BaseModel):
    field: str
    operator: str
    value: Any


class Rule(BaseModel):
    effect: str
    subject: str
    action: str
    resource: str
    conditions: List[Condition] = Field(default_factory=list)
    description: Optional[str] = None


class PolicyIR(BaseModel):
    name: Optional[str] = None
    license: Optional[str] = None
    legal_basis: Optional[str] = None
    purposes: List[str] = Field(default_factory=list)
    retention: Optional[str] = None
    rules: List[Rule] = Field(default_factory=list)


class BytecodeInstruction(BaseModel):
    op: str
    args: List[Any] = Field(default_factory=list)
    description: Optional[str] = None


class CompileResponse(BaseModel):
    ir: PolicyIR
    bytecode: List[BytecodeInstruction]
    reason_panel: Dict[str, Any]


class SimulationLogEntry(BaseModel):
    subject: str
    action: str
    resource: str
    purpose: Optional[str] = None
    retention: Optional[str] = None
    legal_basis: Optional[str] = None
    expected: Optional[str] = None


class SimulationResult(BaseModel):
    context: SimulationLogEntry
    decision: str
    changed: bool
    reason_panel: Dict[str, Any]


class SimulationResponse(BaseModel):
    summary: Dict[str, Any]
    results: List[SimulationResult]


class EnforceRequest(BaseModel):
    policy: str
    subject: str
    action: str
    resource: str
    purpose: Optional[str] = None
    retention: Optional[str] = None
    legal_basis: Optional[str] = None


class EnforceResponse(BaseModel):
    decision: str
    reason_panel: Dict[str, Any]
    bytecode: List[BytecodeInstruction]


class CompileRequest(BaseModel):
    policy: str


class SimulationRequest(BaseModel):
    policy: str
    historical_logs: List[SimulationLogEntry]
