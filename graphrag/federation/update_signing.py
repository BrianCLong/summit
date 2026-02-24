from dataclasses import dataclass

@dataclass(frozen=True)
class SignedUpdate:
  model_id: str
  payload_sha256: str
  signature: str  # stub

def verify(u: SignedUpdate) -> bool:
  # TODO: real signature verification; for now, fail closed unless explicit test fixture says otherwise
  return False
