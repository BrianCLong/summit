from ..api import HEBackend


class CKKSBackend(HEBackend):
    def __init__(self, context=None):
        self.context = context

    def encrypt(self, plain_value, public_params):
        # In a real implementation:
        # import tenseal as ts
        # return ts.ckks_vector(self.context, [plain_value])
        return f"CKKS_CIPHER:{plain_value}"

    def eval_model(self, cipher_graph, cipher_features, model_params_cipher=None):
        # Real CKKS GNN operations here
        return "CKKS_SCORE:STUB"

    def decrypt(self, cipher_value, secret_key):
        # Real CKKS decryption here
        return "CKKS_DECIDED:STUB"
