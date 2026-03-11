import json
import logging
import os
import sys
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
import time

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(message)s')

def log_event(event_name, **kwargs):
    event = {"event": event_name}
    event.update(kwargs)
    logging.info(json.dumps(event))

class HealthMetricsHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode('utf-8'))
        elif self.path == '/metrics':
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'')
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass  # Suppress default HTTP logging

def start_server():
    port = int(os.environ.get('PORT', 9091))
    server = HTTPServer(('0.0.0.0', port), HealthMetricsHandler)
    log_event("server_start", port=port)
    server.serve_forever()

def main():
    log_event("worker_start", type="web_fetch_worker")
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    try:
        while True:
            # Placeholder for actual work
            job_id = "placeholder-job-123"
            log_event("job_start", jobId=job_id, type="web_fetch")
            time.sleep(1) # simulate work
            # For demonstration, log complete
            log_event("job_complete", jobId=job_id, type="web_fetch")
            time.sleep(4)
    except KeyboardInterrupt:
        log_event("worker_stop")
    except Exception as e:
        log_event("worker_crash", error=str(e))
        sys.exit(1)

if __name__ == "__main__":
    main()
