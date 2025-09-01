from dataclasses import dataclass

@dataclass
class ProvenanceReceipt:
    run_id: str
    inputs_hash: str
    code_digest: str
    outputs_hash: str
    signer: str | None = None
