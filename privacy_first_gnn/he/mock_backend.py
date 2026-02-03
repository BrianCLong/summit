from .api import HEBackend


class MockHEBackend(HEBackend):
    def encrypt(self, plain_value, public_params):
        if public_params != "MOCK_PUBLIC_PARAMS":
             raise ValueError("Invalid public params")
        # Deterministic mock encryption
        return f"CIPHER:{plain_value}"

    def eval_model(self, cipher_graph, cipher_features, model_params_cipher=None):
        # Simulate GNN inference on encrypted data
        # Ensure we are not using any plaintext (though in mock we just see the strings)
        for k, v in cipher_features.items():
            if not str(v).startswith("CIPHER:"):
                 raise ValueError(f"Feature {k} is not encrypted!")

        combined = "|".join(cipher_features.values())
        return f"SCORE:{combined}"

    def decrypt(self, cipher_value, secret_key):
        if secret_key != "MOCK_SECRET_KEY":
            raise ValueError("Invalid secret key")

        if cipher_value.startswith("SCORE:"):
            # Mock decryption of the score
            return cipher_value.replace("SCORE:", "DECIDED:")

        if cipher_value.startswith("CIPHER:"):
            return cipher_value.replace("CIPHER:", "")

        return "UNKNOWN"
