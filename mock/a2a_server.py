#!/usr/bin/env python3
from http.server import BaseHTTPRequestHandler, HTTPServer
import json, hashlib, time

class H(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != '/a2a/perform':
            self.send_response(404); self.end_headers(); return
        length = int(self.headers.get('Content-Length','0'))
        body = json.loads(self.rfile.read(length).decode() or '{}')
        # "Policy" allow stub and provenance hash
        result = {"echoTask": body.get('task', {}), "policy": {"allow": True, "reasons": ["dev stub"]}}
        prov = {"hash": hashlib.sha256(json.dumps(result).encode()).hexdigest(), "time": int(time.time())}
        self.send_response(200)
        self.send_header('Content-Type','application/json'); self.end_headers()
        self.wfile.write(json.dumps({"ok": True, "result": result, "provenance": prov}).encode())

if __name__ == '__main__':
    HTTPServer(('127.0.0.1', 8080), H).serve_forever()
