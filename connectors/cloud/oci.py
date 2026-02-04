# connectors/cloud/oci.py

class OCIConnector:
    def __init__(self, region):
        self.region = region

    def connect(self):
        # Stub for OCI connection
        print(f"Connecting to OCI region {self.region}")
        return True
