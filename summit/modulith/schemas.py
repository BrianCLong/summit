from typing import Dict, List, Optional
from pydantic import BaseModel, Field

class ModuleConfig(BaseModel):
    path: str
    allowed_dependencies: List[str] = Field(default_factory=list)

class ModulithConfig(BaseModel):
    modules: Dict[str, ModuleConfig]
    rules: Dict[str, bool] = Field(default_factory=dict)

class Violation(BaseModel):
    evidence_id: str
    from_module: str
    to_module: str
    file_path: str
    line_number: int
    import_path: str

class ModulithReport(BaseModel):
    evidence_id: str
    summary: str
    details: Dict[str, List[Violation]]
    policy_version: str = "0.1.0"

class ModulithMetrics(BaseModel):
    total_files_scanned: int
    total_violations: int
    scan_time_seconds: float

class ModulithStamp(BaseModel):
    evidence_id: str
    tool: str = "summit.modulith"
    version: str = "0.1.0"
    generated_at_utc: str
    input_hash: str
    evidence_id_prefix: str = "MBV"
