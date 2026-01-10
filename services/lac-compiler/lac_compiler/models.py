from typing import Any

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
    conditions: list[Condition] = Field(default_factory=list)
    description: str | None = None


class PolicyIR(BaseModel):
    name: str | None = None
    license: str | None = None
    legal_basis: str | None = None
    purposes: list[str] = Field(default_factory=list)
    retention: str | None = None
    rules: list[Rule] = Field(default_factory=list)


class BytecodeInstruction(BaseModel):
    op: str
    args: list[Any] = Field(default_factory=list)
    description: str | None = None


class CompileResponse(BaseModel):
    ir: PolicyIR
    bytecode: list[BytecodeInstruction]
    reason_panel: dict[str, Any]


class SimulationLogEntry(BaseModel):
    subject: str
    action: str
    resource: str
    purpose: str | None = None
    retention: str | None = None
    legal_basis: str | None = None
    expected: str | None = None


class SimulationResult(BaseModel):
    context: SimulationLogEntry
    decision: str
    changed: bool
    reason_panel: dict[str, Any]


class SimulationResponse(BaseModel):
    summary: dict[str, Any]
    results: list[SimulationResult]


class EnforceRequest(BaseModel):
    policy: str
    subject: str
    action: str
    resource: str
    purpose: str | None = None
    retention: str | None = None
    legal_basis: str | None = None


class EnforceResponse(BaseModel):
    decision: str
    reason_panel: dict[str, Any]
    bytecode: list[BytecodeInstruction]


class CompileRequest(BaseModel):
    policy: str


class SimulationRequest(BaseModel):
    policy: str
    historical_logs: list[SimulationLogEntry]
