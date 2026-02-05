# connectors/cloud/oci.py

class OCIConnector:
    def __init__(self, region):
        self.region = region
        self.connected = False

    def connect(self):
        # Stub for OCI connection
        print(f"Connecting to OCI region {self.region}")
        self.connected = True
        return True

    def is_connected(self):
        return self.connected

    def send(self, task):
        if not self.is_connected():
            raise ConnectionError("Not connected to OCI")
        print(f"Sending task to OCI: {task}")
        return True
