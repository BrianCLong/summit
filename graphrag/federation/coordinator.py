from typing import Optional
from graphrag.federation.flags import federation_enabled
from graphrag.federation.update_signing import SignedUpdate, verify

class Coordinator:
    def apply_update(self, update: SignedUpdate) -> bool:
        if not federation_enabled():
            return False

        if not verify(update):
            raise ValueError("Invalid signature on federated update")

        return True
