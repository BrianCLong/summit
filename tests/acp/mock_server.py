import json
import sys
import time


def main():
    while True:
        line = sys.stdin.readline()
        if not line:
            break

        try:
            req = json.loads(line)
        except Exception:
            continue

        if "method" in req:
            method = req["method"]
            req_id = req.get("id")

            if method == "initialize":
                resp = {"jsonrpc": "2.0", "id": req_id, "result": {"capabilities": {}}}
                sys.stdout.write(json.dumps(resp) + "\n")
                sys.stdout.flush()
            elif method == "session/new":
                resp = {"jsonrpc": "2.0", "id": req_id, "result": {"sessionId": "sess-123"}}
                sys.stdout.write(json.dumps(resp) + "\n")
                sys.stdout.flush()

                # Update
                time.sleep(0.1)
                update = {"jsonrpc": "2.0", "method": "session/update", "params": {"state": "ready"}}
                sys.stdout.write(json.dumps(update) + "\n")
                sys.stdout.flush()
            elif method == "shutdown":
                if req_id:
                     resp = {"jsonrpc": "2.0", "id": req_id, "result": None}
                     sys.stdout.write(json.dumps(resp) + "\n")
                     sys.stdout.flush()
                break
            elif req_id:
                 resp = {"jsonrpc": "2.0", "id": req_id, "result": "ok"}
                 sys.stdout.write(json.dumps(resp) + "\n")
                 sys.stdout.flush()

if __name__ == "__main__":
    main()
