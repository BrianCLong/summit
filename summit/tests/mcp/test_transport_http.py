import unittest
import json
import threading
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from summit.mcp.transport.http_sse import HttpMCPTransport

class FakeMCPServer(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/messages':
            length = int(self.headers['Content-Length'])
            post_data = json.loads(self.rfile.read(length))
            method = post_data.get('method')

            response = {"jsonrpc": "2.0", "id": 1}

            if method == 'tools/list':
                response['result'] = {"tools": [{"name": "fake_tool", "description": "A fake tool"}]}
            elif method == 'tools/call':
                params = post_data.get('params', {})
                name = params.get('name')
                args = params.get('arguments', {})
                if name == 'fake_tool':
                    response['result'] = {"output": f"Called fake_tool with {args}"}
                else:
                    response['error'] = {"code": -32601, "message": "Method not found"}
            else:
                response['error'] = {"code": -32601, "message": "Method not found"}

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

class TestHttpMCPTransportIntegration(unittest.TestCase):
    def setUp(self):
        # Start a local server on a random port
        self.server = HTTPServer(('localhost', 0), FakeMCPServer)
        self.port = self.server.server_port
        self.server_thread = threading.Thread(target=self.server.serve_forever)
        self.server_thread.daemon = True
        self.server_thread.start()
        self.transport = HttpMCPTransport(f"http://localhost:{self.port}")

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()

    def test_roundtrip(self):
        # List tools
        tools = self.transport.list_tools()
        self.assertEqual(len(tools), 1)
        self.assertEqual(tools[0]['name'], 'fake_tool')

        # Call tool
        result = self.transport.call_tool('fake_tool', {'arg1': 'value1'})
        self.assertEqual(result['output'], "Called fake_tool with {'arg1': 'value1'}")

        # Generate artifact if success
        artifact_path = "artifacts/evidence/mcp/roundtrip.report.json"
        os.makedirs(os.path.dirname(artifact_path), exist_ok=True)
        with open(artifact_path, "w") as f:
            json.dump({
                "test_name": "test_transport_http",
                "status": "PASS",
                "transport": "HTTP/SSE",
                "details": "Roundtrip list_tools and call_tool verified against fake server."
            }, f, indent=2)

if __name__ == '__main__':
    unittest.main()
