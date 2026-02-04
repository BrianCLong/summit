from abc import ABC, abstractmethod


class HEBackend(ABC):
    @abstractmethod
    def encrypt(self, plain_value, public_params):
        pass

    @abstractmethod
    def eval_model(self, cipher_graph, cipher_features, model_params_cipher=None):
        pass

    @abstractmethod
    def decrypt(self, cipher_value, secret_key):
        pass

class HEInterface:
    def __init__(self, backend: HEBackend):
        self.backend = backend

    def encrypt(self, plain_value, public_params):
        return self.backend.encrypt(plain_value, public_params)

    def eval_model(self, cipher_graph, cipher_features, model_params_cipher=None):
        return self.backend.eval_model(cipher_graph, cipher_features, model_params_cipher)

    def decrypt(self, cipher_value, secret_key):
        """Note: This should only be called on the edge."""
        return self.backend.decrypt(cipher_value, secret_key)
