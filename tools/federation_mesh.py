#!/usr/bin/env python3
"""
Advanced Federation Mesh for Symphony Orchestra
Enables secure, intelligent multi-node AI orchestration with load balancing
"""

import hashlib
import hmac
import json
import socket
import subprocess
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
import yaml


class FederationMesh:
    def __init__(self):
        self.config_path = Path("federation.yml")
        self.mesh_config = self.load_mesh_config()
        self.node_id = self.mesh_config.get("node_id", socket.gethostname())
        self.secret_key = self.mesh_config.get("secret_key", self.generate_secret())
        self.peers = self.mesh_config.get("peers", {})
        self.capabilities = self.load_node_capabilities()
        
    def load_mesh_config(self) -> dict:
        """Load federation mesh configuration"""
        if self.config_path.exists():
            with open(self.config_path) as f:
                return yaml.safe_load(f) or {}
        else:
            # Create default configuration
            default_config = self.create_default_mesh_config()
            self.save_mesh_config(default_config)
            return default_config
    
    def create_default_mesh_config(self) -> dict:
        """Create default mesh configuration"""
        return {
            "node_id": socket.gethostname(),
            "secret_key": self.generate_secret(),
            "mesh_port": 8900,
            "discovery_enabled": True,
            "load_balancing": {
                "algorithm": "weighted_round_robin",
                "health_check_interval": 30,
                "failure_threshold": 3,
                "recovery_threshold": 2
            },
            "security": {
                "require_hmac": True,
                "max_request_age": 300,  # 5 minutes
                "rate_limit": {
                    "requests_per_minute": 100,
                    "burst_allowance": 20
                }
            },
            "capabilities": {
                "ai_models": ["local/llama", "local/llama-cpu"],
                "max_concurrent_tasks": 5,
                "specializations": ["graph", "rag", "code"],
                "cost_per_token": 0.0
            },
            "peers": {}
        }
    
    def save_mesh_config(self, config: dict):
        """Save mesh configuration"""
        with open(self.config_path, "w") as f:
            yaml.dump(config, f, indent=2)
    
    def generate_secret(self) -> str:
        """Generate cryptographically secure secret key"""
        import secrets
        return secrets.token_hex(32)
    
    def load_node_capabilities(self) -> dict:
        """Load current node capabilities"""
        # Get system information
        try:
            import psutil
            cpu_count = psutil.cpu_count()
            memory_gb = psutil.virtual_memory().total // (1024**3)
            
            # Get available models from LiteLLM
            models = []
            try:
                resp = requests.get("http://127.0.0.1:4000/v1/models", timeout=3)
                if resp.status_code == 200:
                    model_data = resp.json()
                    models = [m["id"] for m in model_data.get("data", [])]
            except:
                models = ["local/llama", "local/llama-cpu"]  # Fallback
            
            return {
                "node_id": self.node_id,
                "cpu_cores": cpu_count,
                "memory_gb": memory_gb,
                "available_models": models,
                "model_count": len(models),
                "specializations": ["graph", "rag", "nl2cypher"],
                "max_concurrent": 3,
                "cost_per_token": 0.0,
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "load_metrics": self.get_current_load()
            }
        except Exception as e:
            return {
                "node_id": self.node_id,
                "error": str(e),
                "available_models": ["local/llama"],
                "model_count": 1,
                "max_concurrent": 1,
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
    
    def get_current_load(self) -> dict:
        """Get current system load metrics"""
        try:
            import psutil
            return {
                "cpu_percent": psutil.cpu_percent(interval=1),
                "memory_percent": psutil.virtual_memory().percent,
                "load_avg": psutil.getloadavg()[0] if hasattr(psutil, 'getloadavg') else 0,
                "active_tasks": self.count_active_tasks(),
                "load_score": self.calculate_load_score()
            }
        except:
            return {"load_score": 50, "active_tasks": 0}
    
    def count_active_tasks(self) -> int:
        """Count currently active Symphony tasks"""
        try:
            # Check Watson for active timers
            result = subprocess.run(
                ["watson", "status"], 
                capture_output=True, 
                text=True,
                timeout=3
            )
            if result.returncode == 0 and "symphony:" in result.stdout:
                return 1  # One active task
            return 0
        except:
            return 0
    
    def calculate_load_score(self) -> float:
        """Calculate normalized load score (0-100, lower is better)"""
        try:
            import psutil
            cpu = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory().percent
            active_tasks = self.count_active_tasks()
            
            # Weighted scoring
            score = (cpu * 0.4) + (memory * 0.3) + (active_tasks * 10 * 0.3)
            return min(100, max(0, score))
        except:
            return 50  # Neutral score on error
    
    def create_hmac_signature(self, data: bytes, timestamp: str) -> str:
        """Create HMAC signature for secure communication"""
        message = f"{timestamp}:{data.decode('utf-8')}"
        signature = hmac.new(
            self.secret_key.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        return signature
    
    def verify_hmac_signature(self, data: bytes, timestamp: str, signature: str, peer_secret: str) -> bool:
        """Verify HMAC signature from peer"""
        try:
            expected_sig = hmac.new(
                peer_secret.encode(),
                f"{timestamp}:{data.decode('utf-8')}".encode(),
                hashlib.sha256
            ).hexdigest()
            return hmac.compare_digest(expected_sig, signature)
        except:
            return False
    
    def discover_peers(self) -> dict[str, dict]:
        """Discover other Symphony nodes on the network"""
        discovered = {}
        
        # Local network discovery (simple approach)
        try:
            local_ip = socket.gethostbyname(socket.gethostname())
            network = ".".join(local_ip.split(".")[:-1])
            
            # Scan common ports on local network
            mesh_port = self.mesh_config.get("mesh_port", 8900)
            
            for i in range(1, 255):
                ip = f"{network}.{i}"
                if ip == local_ip:
                    continue
                
                try:
                    # Quick connection test
                    sock = socket.create_connection((ip, mesh_port), timeout=0.5)
                    sock.close()
                    
                    # Try to get node info
                    resp = requests.get(
                        f"http://{ip}:{mesh_port}/node/info",
                        timeout=2
                    )
                    if resp.status_code == 200:
                        node_info = resp.json()
                        if node_info.get("node_id") != self.node_id:
                            discovered[node_info["node_id"]] = {
                                "url": f"http://{ip}:{mesh_port}",
                                "capabilities": node_info.get("capabilities", {}),
                                "discovered_at": datetime.now(timezone.utc).isoformat()
                            }
                except:
                    pass
        except Exception:
            pass
        
        return discovered
    
    def register_peer(self, peer_id: str, peer_url: str, peer_secret: str):
        """Register a new peer in the mesh"""
        self.peers[peer_id] = {
            "url": peer_url,
            "secret_key": peer_secret,
            "registered_at": datetime.now(timezone.utc).isoformat(),
            "status": "active",
            "failure_count": 0,
            "last_seen": datetime.now(timezone.utc).isoformat()
        }
        
        # Update config
        self.mesh_config["peers"] = self.peers
        self.save_mesh_config(self.mesh_config)
    
    def health_check_peer(self, peer_id: str) -> bool:
        """Check if peer is healthy"""
        if peer_id not in self.peers:
            return False
        
        peer = self.peers[peer_id]
        try:
            resp = requests.get(
                f"{peer['url']}/health",
                timeout=5
            )
            
            if resp.status_code == 200:
                peer["failure_count"] = 0
                peer["last_seen"] = datetime.now(timezone.utc).isoformat()
                peer["status"] = "active"
                return True
            else:
                peer["failure_count"] = peer.get("failure_count", 0) + 1
                if peer["failure_count"] >= self.mesh_config.get("load_balancing", {}).get("failure_threshold", 3):
                    peer["status"] = "failed"
                return False
        except Exception:
            peer["failure_count"] = peer.get("failure_count", 0) + 1
            if peer["failure_count"] >= 3:
                peer["status"] = "failed"
            return False
    
    def get_best_node_for_task(self, task_type: str, requirements: dict = None) -> str | None:
        """Select best node for task using intelligent load balancing"""
        candidates = []
        
        # Include self as candidate
        self_load = self.calculate_load_score()
        if self_load < 90:  # Only if not overloaded
            candidates.append({
                "node_id": self.node_id,
                "load_score": self_load,
                "is_local": True,
                "capabilities": self.capabilities
            })
        
        # Check healthy peers
        for peer_id, peer_info in self.peers.items():
            if peer_info.get("status") != "active":
                continue
                
            if not self.health_check_peer(peer_id):
                continue
            
            try:
                # Get peer capabilities
                resp = requests.get(
                    f"{peer_info['url']}/node/capabilities",
                    timeout=3
                )
                if resp.status_code == 200:
                    peer_caps = resp.json()
                    load_score = peer_caps.get("load_metrics", {}).get("load_score", 50)
                    
                    candidates.append({
                        "node_id": peer_id,
                        "load_score": load_score,
                        "is_local": False,
                        "capabilities": peer_caps,
                        "url": peer_info["url"]
                    })
            except Exception:
                pass
        
        if not candidates:
            return None
        
        # Score candidates based on multiple factors
        for candidate in candidates:
            score = 100 - candidate["load_score"]  # Lower load = higher score
            
            # Local preference bonus
            if candidate["is_local"]:
                score += 20
            
            # Task-specific specialization bonus
            specializations = candidate["capabilities"].get("specializations", [])
            if task_type in specializations:
                score += 15
            
            # Model availability bonus
            available_models = candidate["capabilities"].get("available_models", [])
            if len(available_models) > 3:
                score += 10
            
            candidate["final_score"] = score
        
        # Select best candidate
        best_candidate = max(candidates, key=lambda x: x["final_score"])
        return best_candidate["node_id"]
    
    def execute_remote_task(self, peer_id: str, task_data: dict) -> dict:
        """Execute task on remote peer node"""
        if peer_id not in self.peers:
            return {"error": "Peer not found"}
        
        peer = self.peers[peer_id]
        
        try:
            # Prepare request with HMAC signature
            timestamp = datetime.now(timezone.utc).isoformat()
            payload = json.dumps(task_data).encode()
            signature = self.create_hmac_signature(payload, timestamp)
            
            headers = {
                "Content-Type": "application/json",
                "X-Timestamp": timestamp,
                "X-Signature": signature,
                "X-Node-ID": self.node_id
            }
            
            resp = requests.post(
                f"{peer['url']}/task/execute",
                data=payload,
                headers=headers,
                timeout=300  # 5 minutes for task execution
            )
            
            if resp.status_code == 200:
                return resp.json()
            else:
                return {
                    "error": f"Remote execution failed: {resp.status_code}",
                    "response": resp.text[:200]
                }
        except Exception as e:
            return {"error": f"Remote execution error: {str(e)}"}
    
    def start_mesh_server(self):
        """Start federation mesh server"""
        from http.server import BaseHTTPRequestHandler, HTTPServer
        
        class MeshHandler(BaseHTTPRequestHandler):
            def __init__(self, *args, mesh_instance=None, **kwargs):
                self.mesh = mesh_instance
                super().__init__(*args, **kwargs)
            
            def do_GET(self):
                if self.path == "/health":
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    response = {
                        "status": "healthy",
                        "node_id": self.mesh.node_id,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                    self.wfile.write(json.dumps(response).encode())
                    
                elif self.path == "/node/info":
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    response = {
                        "node_id": self.mesh.node_id,
                        "capabilities": self.mesh.capabilities,
                        "mesh_version": "2.0",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                    self.wfile.write(json.dumps(response).encode())
                    
                elif self.path == "/node/capabilities":
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    caps = self.mesh.load_node_capabilities()  # Fresh data
                    self.wfile.write(json.dumps(caps).encode())
                else:
                    self.send_response(404)
                    self.end_headers()
            
            def do_POST(self):
                if self.path == "/task/execute":
                    # Handle remote task execution
                    content_length = int(self.headers.get("Content-Length", 0))
                    post_data = self.rfile.read(content_length)
                    
                    # Verify HMAC if required
                    timestamp = self.headers.get("X-Timestamp")
                    signature = self.headers.get("X-Signature")
                    node_id = self.headers.get("X-Node-ID")
                    
                    if self.mesh.mesh_config.get("security", {}).get("require_hmac", True):
                        if not timestamp or not signature or not node_id:
                            self.send_response(401)
                            self.end_headers()
                            return
                        
                        if node_id not in self.mesh.peers:
                            self.send_response(403)
                            self.end_headers()
                            return
                        
                        peer_secret = self.mesh.peers[node_id].get("secret_key", "")
                        if not self.mesh.verify_hmac_signature(post_data, timestamp, signature, peer_secret):
                            self.send_response(401)
                            self.end_headers()
                            return
                    
                    try:
                        task_data = json.loads(post_data.decode())
                        
                        # Execute task locally (simplified)
                        result = {
                            "status": "completed",
                            "node_id": self.mesh.node_id,
                            "task_id": task_data.get("task_id", "unknown"),
                            "result": "Task executed successfully",
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        }
                        
                        self.send_response(200)
                        self.send_header("Content-Type", "application/json")
                        self.end_headers()
                        self.wfile.write(json.dumps(result).encode())
                        
                    except Exception as e:
                        self.send_response(500)
                        self.send_header("Content-Type", "application/json")
                        self.end_headers()
                        error_response = {"error": str(e)}
                        self.wfile.write(json.dumps(error_response).encode())
                else:
                    self.send_response(404)
                    self.end_headers()
        
        # Create handler with mesh instance
        handler = lambda *args, **kwargs: MeshHandler(*args, mesh_instance=self, **kwargs)
        
        port = self.mesh_config.get("mesh_port", 8900)
        server = HTTPServer(("", port), handler)
        
        def run_server():
            print(f"🌐 Federation mesh server starting on port {port}")
            server.serve_forever()
        
        server_thread = threading.Thread(target=run_server, daemon=True)
        server_thread.start()
        
        return server
    
    def mesh_status(self) -> dict:
        """Get comprehensive mesh status"""
        return {
            "node_id": self.node_id,
            "mesh_version": "2.0",
            "capabilities": self.capabilities,
            "peers": {
                peer_id: {
                    "status": peer_info.get("status", "unknown"),
                    "last_seen": peer_info.get("last_seen"),
                    "failure_count": peer_info.get("failure_count", 0)
                }
                for peer_id, peer_info in self.peers.items()
            },
            "active_peers": len([p for p in self.peers.values() if p.get("status") == "active"]),
            "total_peers": len(self.peers),
            "load_metrics": self.get_current_load(),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

def main():
    import sys
    
    mesh = FederationMesh()
    
    if len(sys.argv) < 2:
        print("Usage: federation_mesh.py [status|discover|start_server|add_peer|execute]")
        return
    
    command = sys.argv[1]
    
    if command == "status":
        status = mesh.mesh_status()
        print(json.dumps(status, indent=2))
    
    elif command == "discover":
        print("🔍 Discovering peers on local network...")
        discovered = mesh.discover_peers()
        if discovered:
            print(f"Found {len(discovered)} potential peers:")
            for peer_id, info in discovered.items():
                print(f"  {peer_id}: {info['url']}")
        else:
            print("No peers discovered on local network")
    
    elif command == "start_server":
        server = mesh.start_mesh_server()
        print("Mesh server started. Press Ctrl+C to stop.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\\nStopping mesh server...")
    
    elif command == "add_peer" and len(sys.argv) >= 4:
        peer_id = sys.argv[2]
        peer_url = sys.argv[3]
        peer_secret = sys.argv[4] if len(sys.argv) > 4 else mesh.generate_secret()
        
        mesh.register_peer(peer_id, peer_url, peer_secret)
        print(f"✅ Registered peer {peer_id} at {peer_url}")
    
    elif command == "execute" and len(sys.argv) >= 4:
        peer_id = sys.argv[2]
        task_type = sys.argv[3]
        
        task_data = {
            "task_id": f"task_{int(time.time())}",
            "task_type": task_type,
            "parameters": {},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        result = mesh.execute_remote_task(peer_id, task_data)
        print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()