import os
from pathlib import Path


def verify_no_server_secret_key(config_dir):
    """
    Ensure no secret keys are stored in the config directory.
    """
    forbidden_extensions = {".key", ".pem", ".sk"}
    forbidden_patterns = {"secret", "private_key", "key"}

    for p in Path(config_dir).rglob("*"):
        if p.is_file():
            if p.suffix in forbidden_extensions:
                return False, f"Forbidden key file found: {p}"
            if any(pat in p.name.lower() for pat in forbidden_patterns):
                # Check content for "BEGIN PRIVATE KEY" etc.
                try:
                    content = p.read_text()
                    if "PRIVATE KEY" in content:
                        return False, f"Private key material found in {p}"
                except:
                    pass
    return True, "OK"

if __name__ == "__main__":
    pass
