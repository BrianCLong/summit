import sys
import socket
from urllib.parse import urlparse
import logging

# Configure logging
logger = logging.getLogger("offline_network_guard")

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "::1"]
ALLOWED_PORTS = [1234] # Local LLM port

def is_allowed(host, port=None):
    if host not in ALLOWED_HOSTS:
        return False
    if port is not None and port not in ALLOWED_PORTS:
        return False
    return True

def check_url(url):
    parsed = urlparse(url)
    hostname = parsed.hostname
    port = parsed.port

    if not hostname:
        # Handle cases where url might be just a path or invalid
        return True

    # Default ports
    if port is None:
        if parsed.scheme == "http":
            port = 80
        elif parsed.scheme == "https":
            port = 443

    if not is_allowed(hostname, port):
        raise RuntimeError(f"Network access denied in OFFLINE mode: {url}")

def activate():
    """
    Activates the network guard by monkeypatching requests and socket.
    """
    # Monkeypatch requests
    try:
        import requests.adapters
        original_send = requests.adapters.HTTPAdapter.send

        def guarded_send(self, request, *args, **kwargs):
            check_url(request.url)
            return original_send(self, request, *args, **kwargs)

        requests.adapters.HTTPAdapter.send = guarded_send
        logger.info("Monkeypatched requests.adapters.HTTPAdapter.send")
    except ImportError:
        pass

    # Monkeypatch socket (lower level)
    original_socket_connect = socket.socket.connect

    def guarded_connect(self, address):
        # Handle different address families
        host = None
        port = None

        if isinstance(address, tuple):
            if len(address) == 2: # IPv4: (host, port)
                host, port = address
            elif len(address) == 4: # IPv6: (host, port, flowinfo, scopeid)
                host, port, _, _ = address
        elif isinstance(address, (str, bytes)):
            # Unix socket, generally local and safe-ish, but let's log/allow for now
            # or treat as localhost
            return original_socket_connect(self, address)

        if host and port:
            if not is_allowed(host, port):
                 raise RuntimeError(f"Socket connection denied in OFFLINE mode: {host}:{port}")

        return original_socket_connect(self, address)

    socket.socket.connect = guarded_connect
    logger.info("Monkeypatched socket.socket.connect")

if __name__ == "__main__":
    activate()
    print("Offline network guard active.")
    # Test
    try:
        import requests
        print("Testing allowed call...")
        try:
            requests.get("http://localhost:1234/v1/models", timeout=1)
        except requests.exceptions.ConnectionError:
            print("Connection error to localhost (expected if server not running), but guard passed.")
        except RuntimeError as e:
            print(f"FAILED: Localhost blocked: {e}")
            sys.exit(1)

        print("Testing blocked call...")
        try:
            requests.get("https://www.google.com", timeout=1)
            print("FAILED: External call succeeded!")
            sys.exit(1)
        except RuntimeError as e:
            print(f"SUCCESS: External call blocked: {e}")

    except ImportError:
        print("requests module not installed, skipping requests test.")
