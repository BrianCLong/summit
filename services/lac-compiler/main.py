from typing import Any

from fastapi import FastAPI, HTTPException
from lac_compiler.bytecode import BytecodeCompiler
from lac_compiler.dsl import DSLParseError, PolicyDSLParser
from lac_compiler.models import (
    CompileRequest,
    CompileResponse,
    EnforceRequest,
    EnforceResponse,
    SimulationRequest,
    SimulationResponse,
    SimulationResult,
)
from lac_compiler.runtime import EnforcementEngine

app = FastAPI(title="License/Authority Compiler", version="0.1.0")


def build_reason_panel(policy_ir, bytecode, decision=None):
    clauses = []
    if policy_ir.license:
        clauses.append({"field": "license", "detail": policy_ir.license})
    if policy_ir.legal_basis:
        clauses.append({"field": "legal_basis", "detail": policy_ir.legal_basis})
    if policy_ir.purposes:
        clauses.append({"field": "purpose", "detail": policy_ir.purposes})
    if policy_ir.retention:
        clauses.append({"field": "retention", "detail": policy_ir.retention})
    return {
        "decision": decision or "compiled",
        "clauses": clauses,
        "appeal": "Contact data steward with legal basis evidence.",
        "bytecode_length": len(bytecode),
    }


@app.post("/compile", response_model=CompileResponse)
async def compile_policy(body: CompileRequest):
    parser = PolicyDSLParser()
    compiler = BytecodeCompiler()
    try:
        policy_ir = parser.parse(body.policy)
    except DSLParseError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    bytecode = compiler.compile(policy_ir)
    reason_panel = build_reason_panel(policy_ir, bytecode)
    return CompileResponse(ir=policy_ir, bytecode=bytecode, reason_panel=reason_panel)


@app.post("/simulate", response_model=SimulationResponse)
async def simulate_policy(body: SimulationRequest):
    parser = PolicyDSLParser()
    compiler = BytecodeCompiler()
    try:
        policy_ir = parser.parse(body.policy)
    except DSLParseError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    bytecode = compiler.compile(policy_ir)
    engine = EnforcementEngine(bytecode)

    results = []
    changes = 0
    for log in body.historical_logs:
        decision, reason_panel = engine.evaluate(log.model_dump())
        changed = log.expected is not None and decision != log.expected
        if changed:
            changes += 1
        results.append(
            SimulationResult(
                context=log,
                decision=decision,
                changed=changed,
                reason_panel=reason_panel,
            )
        )

    summary: dict[str, Any] = {
        "total": len(body.historical_logs),
        "changed": changes,
        "unchanged": len(body.historical_logs) - changes,
    }
    return SimulationResponse(summary=summary, results=results)


@app.post("/enforce", response_model=EnforceResponse)
async def enforce_policy(body: EnforceRequest):
    parser = PolicyDSLParser()
    compiler = BytecodeCompiler()
    try:
        policy_ir = parser.parse(body.policy)
    except DSLParseError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    bytecode = compiler.compile(policy_ir)
    engine = EnforcementEngine(bytecode)
    decision, reason_panel = engine.evaluate(body.model_dump())
    return EnforceResponse(decision=decision, reason_panel=reason_panel, bytecode=bytecode)


@app.get("/health")
async def health():
    return {"status": "ok"}
