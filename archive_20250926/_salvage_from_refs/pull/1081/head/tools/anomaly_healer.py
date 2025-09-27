#!/usr/bin/env python3
"""
Predictive Anomaly Detection & Self-Healing Engine
Autonomous monitoring, anomaly detection, and automatic remediation
"""
import json, os, sys, sqlite3, time, statistics, subprocess
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from collections import deque, defaultdict
import threading
import signal

ROOT = Path(__file__).resolve().parent.parent
ANOMALY_DB = ROOT / "data" / "anomaly_detection.db"
HEALING_LOG = ROOT / "logs" / "self_healing.jsonl"
METRICS_CACHE = {}
HEALING_ACTIONS = {}

class AnomalyDetector:
    def __init__(self):
        self.ensure_dirs()
        self.init_db()
        self.load_healing_protocols()
        self.baseline_metrics = {}
        self.running = False
        
    def ensure_dirs(self):
        """Ensure required directories exist"""
        for path in [ANOMALY_DB.parent, HEALING_LOG.parent]:
            path.mkdir(parents=True, exist_ok=True)
    
    def init_db(self):
        """Initialize anomaly detection database"""
        conn = sqlite3.connect(str(ANOMALY_DB))
        
        # Metrics history
        conn.execute("""
            CREATE TABLE IF NOT EXISTS metrics_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL NOT NULL,
                metric_type TEXT NOT NULL,
                metric_name TEXT NOT NULL,
                value REAL NOT NULL,
                source TEXT NOT NULL,
                tags TEXT DEFAULT '{}' -- JSON metadata
            )
        """)
        
        # Anomaly events
        conn.execute("""
            CREATE TABLE IF NOT EXISTS anomalies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                detected_at REAL NOT NULL,
                metric_type TEXT NOT NULL,
                metric_name TEXT NOT NULL,
                anomaly_type TEXT NOT NULL, -- spike, drop, drift, pattern
                severity INTEGER NOT NULL, -- 1=low, 2=medium, 3=high, 4=critical
                current_value REAL,
                expected_value REAL,
                deviation_score REAL,
                context TEXT, -- JSON with additional context
                resolution_status TEXT DEFAULT 'detected', -- detected, healing, resolved, failed
                healing_actions TEXT DEFAULT '[]', -- JSON array of actions taken
                resolved_at REAL
            )
        """)
        
        # Baseline models for different metrics
        conn.execute("""
            CREATE TABLE IF NOT EXISTS baselines (
                metric_type TEXT NOT NULL,
                metric_name TEXT NOT NULL,
                baseline_mean REAL NOT NULL,
                baseline_std REAL NOT NULL,
                sample_count INTEGER NOT NULL,
                last_updated REAL NOT NULL,
                seasonal_pattern TEXT, -- JSON for hourly/daily patterns
                PRIMARY KEY (metric_type, metric_name)
            )
        """)
        
        # Healing actions registry
        conn.execute("""
            CREATE TABLE IF NOT EXISTS healing_registry (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action_name TEXT NOT NULL UNIQUE,
                trigger_conditions TEXT NOT NULL, -- JSON conditions
                command_template TEXT NOT NULL,
                timeout_seconds INTEGER DEFAULT 300,
                max_attempts INTEGER DEFAULT 3,
                cooldown_minutes INTEGER DEFAULT 15,
                success_indicators TEXT, -- JSON array of success checks
                rollback_commands TEXT DEFAULT '[]', -- JSON array for rollback
                enabled BOOLEAN DEFAULT 1
            )
        """)
        
        # Create indexes
        conn.execute("CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics_history(timestamp)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_metrics_type ON metrics_history(metric_type, metric_name)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_anomalies_detected ON anomalies(detected_at)")
        
        conn.commit()
        conn.close()
    
    def load_healing_protocols(self):
        """Load predefined healing protocols"""
        default_protocols = [
            {
                "action_name": "restart_litellm",
                "trigger_conditions": {
                    "metric_type": "service",
                    "metric_name": "litellm_availability",
                    "anomaly_types": ["drop", "spike"],
                    "min_severity": 3
                },
                "command_template": "just ai-down && sleep 2 && just ai-up",
                "timeout_seconds": 60,
                "max_attempts": 2,
                "cooldown_minutes": 5,
                "success_indicators": ["curl -s http://127.0.0.1:4000/v1/models | jq -r '.data[0].id'"]
            },
            {
                "action_name": "clear_model_cache",
                "trigger_conditions": {
                    "metric_type": "performance",
                    "metric_name": "avg_latency_ms",
                    "anomaly_types": ["spike"],
                    "min_severity": 2
                },
                "command_template": "pkill -f ollama && sleep 3 && just ollama-up",
                "timeout_seconds": 120,
                "max_attempts": 1,
                "cooldown_minutes": 10
            },
            {
                "action_name": "restart_neo4j",
                "trigger_conditions": {
                    "metric_type": "service",
                    "metric_name": "neo4j_connectivity",
                    "anomaly_types": ["drop"],
                    "min_severity": 3
                },
                "command_template": "just neo4j-down && sleep 5 && just neo4j-up",
                "timeout_seconds": 180,
                "max_attempts": 2,
                "cooldown_minutes": 10
            },
            {
                "action_name": "disk_cleanup",
                "trigger_conditions": {
                    "metric_type": "system",
                    "metric_name": "disk_usage_percent",
                    "anomaly_types": ["spike"],
                    "min_severity": 3
                },
                "command_template": "find /tmp -name '*.log' -mtime +1 -delete && find . -name '*.pyc' -delete",
                "timeout_seconds": 30,
                "max_attempts": 1,
                "cooldown_minutes": 60
            }
        ]
        
        conn = sqlite3.connect(str(ANOMALY_DB))
        for protocol in default_protocols:
            conn.execute("""
                INSERT OR REPLACE INTO healing_registry 
                (action_name, trigger_conditions, command_template, timeout_seconds, 
                 max_attempts, cooldown_minutes, success_indicators)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                protocol["action_name"],
                json.dumps(protocol["trigger_conditions"]),
                protocol["command_template"],
                protocol["timeout_seconds"],
                protocol["max_attempts"],
                protocol["cooldown_minutes"],
                json.dumps(protocol.get("success_indicators", []))
            ))
        conn.commit()
        conn.close()
    
    def collect_system_metrics(self) -> Dict[str, Any]:
        """Collect comprehensive system metrics"""
        metrics = {}
        timestamp = time.time()
        
        # System metrics
        try:
            import psutil
            
            # CPU and Memory
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            metrics.update({
                "cpu_usage_percent": cpu_percent,
                "memory_usage_percent": memory.percent,
                "memory_available_gb": memory.available / (1024**3),
                "disk_usage_percent": disk.percent,
                "disk_free_gb": disk.free / (1024**3)
            })
            
            # Network connections
            connections = len(psutil.net_connections())
            metrics["active_connections"] = connections
            
        except ImportError:
            # Fallback for systems without psutil
            try:
                # Basic system info via shell commands
                load_avg = os.getloadavg()[0] if hasattr(os, 'getloadavg') else 0
                metrics["load_average"] = load_avg
            except:
                pass
        
        # Service availability checks
        services = {
            "litellm_availability": "curl -s http://127.0.0.1:4000/health || echo 'down'",
            "neo4j_connectivity": "curl -s http://127.0.0.1:7474 || echo 'down'",
            "rag_index_health": "ls rag/index/rag.duckdb 2>/dev/null || echo 'missing'"
        }
        
        for service, check_cmd in services.items():
            try:
                result = subprocess.run(check_cmd, shell=True, capture_output=True, text=True, timeout=10)
                metrics[service] = 1.0 if result.returncode == 0 and "down" not in result.stdout else 0.0
            except:
                metrics[service] = 0.0
        
        # Performance metrics from burndown data
        burndown_path = ROOT / "status" / "burndown.json"
        if burndown_path.exists():
            try:
                with open(burndown_path, 'r') as f:
                    burndown = json.load(f)
                
                perf = burndown.get("perf", {})
                metrics.update({
                    "rps_last_60s": perf.get("rps_last_60s", 0),
                    "p50_latency_ms": perf.get("p50_ms_last_60s", 0),
                    "p95_latency_ms": perf.get("p95_ms_last_60s", 0)
                })
                
                # Model-specific metrics
                for window in ["m1", "h1"]:
                    window_data = burndown.get("windows", {}).get(window, {})
                    totals = window_data.get("totals", {})
                    if totals.get("req", 0) > 0:
                        metrics[f"{window}_request_count"] = totals["req"]
                        metrics[f"{window}_avg_cost"] = totals.get("cost", 0) / totals["req"]
                        metrics[f"{window}_success_rate"] = 1.0  # Assume success if requests exist
                
            except Exception as e:
                print(f"Warning: Could not read burndown data: {e}")
        
        return {"timestamp": timestamp, "metrics": metrics}
    
    def store_metrics(self, metrics_data: Dict[str, Any]):
        """Store metrics in database"""
        conn = sqlite3.connect(str(ANOMALY_DB))
        
        timestamp = metrics_data["timestamp"]
        metrics = metrics_data["metrics"]
        
        for metric_name, value in metrics.items():
            if not isinstance(value, (int, float)):
                continue
                
            # Determine metric type
            if metric_name.endswith(("_percent", "_usage", "_rate")):
                metric_type = "performance"
            elif "availability" in metric_name or "connectivity" in metric_name or "health" in metric_name:
                metric_type = "service"
            elif metric_name.startswith(("cpu", "memory", "disk", "load")):
                metric_type = "system"
            else:
                metric_type = "application"
            
            conn.execute("""
                INSERT INTO metrics_history (timestamp, metric_type, metric_name, value, source)
                VALUES (?, ?, ?, ?, ?)
            """, (timestamp, metric_type, metric_name, float(value), "system_collector"))
        
        conn.commit()
        conn.close()
    
    def update_baselines(self, lookback_hours: int = 24):
        """Update baseline models for anomaly detection"""
        conn = sqlite3.connect(str(ANOMALY_DB))
        
        cutoff_time = time.time() - (lookback_hours * 3600)
        
        # Get unique metrics
        cursor = conn.execute("""
            SELECT DISTINCT metric_type, metric_name 
            FROM metrics_history 
            WHERE timestamp > ?
        """, (cutoff_time,))
        
        for metric_type, metric_name in cursor.fetchall():
            # Get recent values
            values_cursor = conn.execute("""
                SELECT value FROM metrics_history 
                WHERE metric_type = ? AND metric_name = ? AND timestamp > ?
                ORDER BY timestamp
            """, (metric_type, metric_name, cutoff_time))
            
            values = [row[0] for row in values_cursor.fetchall()]
            
            if len(values) < 10:  # Need minimum samples
                continue
            
            # Calculate baseline statistics
            mean_val = statistics.mean(values)
            std_val = statistics.stdev(values) if len(values) > 1 else 0.1
            
            # Store/update baseline
            conn.execute("""
                INSERT OR REPLACE INTO baselines 
                (metric_type, metric_name, baseline_mean, baseline_std, sample_count, last_updated)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (metric_type, metric_name, mean_val, std_val, len(values), time.time()))
        
        conn.commit()
        conn.close()
    
    def detect_anomalies(self, current_metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Detect anomalies in current metrics"""
        conn = sqlite3.connect(str(ANOMALY_DB))
        anomalies = []
        
        # Get baselines
        cursor = conn.execute("SELECT * FROM baselines")
        baselines = {(row[0], row[1]): row[2:] for row in cursor.fetchall()}
        
        timestamp = current_metrics["timestamp"]
        metrics = current_metrics["metrics"]
        
        for metric_name, current_value in metrics.items():
            if not isinstance(current_value, (int, float)):
                continue
            
            # Determine metric type
            if metric_name.endswith(("_percent", "_usage", "_rate")):
                metric_type = "performance"
            elif "availability" in metric_name or "connectivity" in metric_name:
                metric_type = "service"
            elif metric_name.startswith(("cpu", "memory", "disk")):
                metric_type = "system"
            else:
                metric_type = "application"
            
            # Get baseline for this metric
            baseline_key = (metric_type, metric_name)
            if baseline_key not in baselines:
                continue
            
            baseline_mean, baseline_std, sample_count, last_updated = baselines[baseline_key]
            
            # Skip if baseline is too old or insufficient
            if time.time() - last_updated > 86400 or sample_count < 10:
                continue
            
            # Calculate deviation score
            if baseline_std == 0:
                baseline_std = abs(baseline_mean) * 0.1 or 0.1  # Avoid division by zero
            
            deviation_score = abs(current_value - baseline_mean) / baseline_std
            
            # Classify anomaly type and severity
            anomaly_type = None
            severity = 0
            
            if current_value > baseline_mean + (3 * baseline_std):
                anomaly_type = "spike"
                severity = 3 if deviation_score > 5 else 2
            elif current_value < baseline_mean - (3 * baseline_std):
                anomaly_type = "drop"
                severity = 3 if deviation_score > 5 else 2
            elif deviation_score > 2:
                anomaly_type = "drift"
                severity = 1
            
            # Special handling for service availability
            if metric_type == "service" and current_value == 0:
                anomaly_type = "drop"
                severity = 4  # Critical
            
            # Special handling for critical system metrics
            if metric_name == "disk_usage_percent" and current_value > 90:
                anomaly_type = "spike"
                severity = 4  # Critical
            elif metric_name == "memory_usage_percent" and current_value > 95:
                anomaly_type = "spike" 
                severity = 3  # High
            
            if anomaly_type and severity > 0:
                anomaly = {
                    "timestamp": timestamp,
                    "metric_type": metric_type,
                    "metric_name": metric_name,
                    "anomaly_type": anomaly_type,
                    "severity": severity,
                    "current_value": current_value,
                    "expected_value": baseline_mean,
                    "deviation_score": deviation_score,
                    "context": {
                        "baseline_std": baseline_std,
                        "sample_count": sample_count
                    }
                }
                
                anomalies.append(anomaly)
                
                # Store in database
                conn.execute("""
                    INSERT INTO anomalies 
                    (detected_at, metric_type, metric_name, anomaly_type, severity,
                     current_value, expected_value, deviation_score, context)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    timestamp, metric_type, metric_name, anomaly_type, severity,
                    current_value, baseline_mean, deviation_score, json.dumps(anomaly["context"])
                ))
        
        conn.commit()
        conn.close()
        
        return anomalies
    
    def trigger_healing_actions(self, anomalies: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Trigger appropriate healing actions for detected anomalies"""
        conn = sqlite3.connect(str(ANOMALY_DB))
        healing_results = []
        
        # Get healing protocols
        cursor = conn.execute("SELECT * FROM healing_registry WHERE enabled = 1")
        protocols = []
        for row in cursor.fetchall():
            protocol = {
                "action_name": row[1],
                "trigger_conditions": json.loads(row[2]),
                "command_template": row[3],
                "timeout_seconds": row[4],
                "max_attempts": row[5],
                "cooldown_minutes": row[6],
                "success_indicators": json.loads(row[7]) if row[7] else []
            }
            protocols.append(protocol)
        
        for anomaly in anomalies:
            if anomaly["severity"] < 2:  # Only heal medium+ severity
                continue
            
            # Find matching healing protocols
            for protocol in protocols:
                conditions = protocol["trigger_conditions"]
                
                # Check if this protocol matches the anomaly
                if (conditions.get("metric_type") == anomaly["metric_type"] and
                    conditions.get("metric_name") == anomaly["metric_name"] and
                    anomaly["anomaly_type"] in conditions.get("anomaly_types", []) and
                    anomaly["severity"] >= conditions.get("min_severity", 1)):
                    
                    # Check cooldown
                    cooldown_key = f"{protocol['action_name']}_{anomaly['metric_name']}"
                    last_action = HEALING_ACTIONS.get(cooldown_key, 0)
                    cooldown_seconds = protocol["cooldown_minutes"] * 60
                    
                    if time.time() - last_action < cooldown_seconds:
                        print(f"⏳ Healing action {protocol['action_name']} in cooldown")
                        continue
                    
                    # Execute healing action
                    print(f"🔧 Executing healing action: {protocol['action_name']}")
                    result = self.execute_healing_action(protocol, anomaly)
                    healing_results.append(result)
                    
                    # Update cooldown tracker
                    HEALING_ACTIONS[cooldown_key] = time.time()
                    
                    # Log healing action
                    self.log_healing_action(anomaly, protocol, result)
                    
                    break  # Only execute first matching protocol
        
        conn.close()
        return healing_results
    
    def execute_healing_action(self, protocol: Dict[str, Any], anomaly: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a healing action with retry logic"""
        action_name = protocol["action_name"]
        command = protocol["command_template"]
        max_attempts = protocol["max_attempts"]
        timeout = protocol["timeout_seconds"]
        success_indicators = protocol["success_indicators"]
        
        result = {
            "action_name": action_name,
            "command": command,
            "attempts": 0,
            "success": False,
            "output": "",
            "error": "",
            "duration_seconds": 0
        }
        
        for attempt in range(max_attempts):
            result["attempts"] = attempt + 1
            start_time = time.time()
            
            try:
                print(f"  Attempt {attempt + 1}/{max_attempts}: {command}")
                
                # Execute command
                process_result = subprocess.run(
                    command, 
                    shell=True, 
                    capture_output=True, 
                    text=True, 
                    timeout=timeout
                )
                
                result["duration_seconds"] = time.time() - start_time
                result["output"] = process_result.stdout
                result["error"] = process_result.stderr
                
                # Check if action succeeded
                if process_result.returncode == 0:
                    # Verify success with indicators if provided
                    if success_indicators:
                        success_verified = True
                        for indicator in success_indicators:
                            try:
                                verify_result = subprocess.run(
                                    indicator, 
                                    shell=True, 
                                    capture_output=True, 
                                    text=True, 
                                    timeout=30
                                )
                                if verify_result.returncode != 0:
                                    success_verified = False
                                    break
                            except:
                                success_verified = False
                                break
                        
                        result["success"] = success_verified
                    else:
                        result["success"] = True
                    
                    if result["success"]:
                        print(f"  ✅ Healing action succeeded")
                        break
                else:
                    print(f"  ❌ Command failed with code {process_result.returncode}")
                
            except subprocess.TimeoutExpired:
                result["duration_seconds"] = timeout
                result["error"] = f"Command timed out after {timeout}s"
                print(f"  ⏰ Command timed out")
            except Exception as e:
                result["duration_seconds"] = time.time() - start_time
                result["error"] = str(e)
                print(f"  💥 Command failed: {e}")
            
            # Wait before retry
            if attempt < max_attempts - 1:
                time.sleep(2)
        
        if not result["success"]:
            print(f"  💥 Healing action failed after {max_attempts} attempts")
        
        return result
    
    def log_healing_action(self, anomaly: Dict[str, Any], protocol: Dict[str, Any], result: Dict[str, Any]):
        """Log healing action for audit trail"""
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "anomaly": {
                "metric_type": anomaly["metric_type"],
                "metric_name": anomaly["metric_name"],
                "severity": anomaly["severity"],
                "current_value": anomaly["current_value"],
                "expected_value": anomaly["expected_value"]
            },
            "healing_action": {
                "action_name": protocol["action_name"],
                "command": protocol["command_template"],
                "attempts": result["attempts"],
                "success": result["success"],
                "duration_seconds": result["duration_seconds"]
            },
            "output": result.get("output", ""),
            "error": result.get("error", "")
        }
        
        HEALING_LOG.parent.mkdir(parents=True, exist_ok=True)
        with open(HEALING_LOG, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')
    
    def monitoring_loop(self, interval_seconds: int = 60):
        """Main monitoring loop"""
        print(f"🔍 Starting anomaly detection loop (interval: {interval_seconds}s)")
        self.running = True
        
        while self.running:
            try:
                # Collect metrics
                metrics_data = self.collect_system_metrics()
                self.store_metrics(metrics_data)
                
                # Update baselines periodically (every 10th iteration)
                if int(time.time() / interval_seconds) % 10 == 0:
                    print("📊 Updating baselines...")
                    self.update_baselines()
                
                # Detect anomalies
                anomalies = self.detect_anomalies(metrics_data)
                
                if anomalies:
                    print(f"🚨 Detected {len(anomalies)} anomalies:")
                    for anomaly in anomalies:
                        severity_emoji = ["", "⚠️", "🔶", "🔴", "💀"][anomaly["severity"]]
                        print(f"  {severity_emoji} {anomaly['metric_name']}: {anomaly['anomaly_type']} "
                              f"(current: {anomaly['current_value']:.2f}, expected: {anomaly['expected_value']:.2f})")
                    
                    # Trigger healing actions
                    healing_results = self.trigger_healing_actions(anomalies)
                    
                    if healing_results:
                        successful_healings = sum(1 for r in healing_results if r["success"])
                        print(f"🔧 Executed {len(healing_results)} healing actions ({successful_healings} successful)")
                else:
                    # Silent operation - only print status every 10 minutes
                    if int(time.time()) % 600 == 0:
                        print(f"✅ System healthy - {len(metrics_data['metrics'])} metrics monitored")
                
                time.sleep(interval_seconds)
                
            except KeyboardInterrupt:
                print("\n🛑 Monitoring stopped by user")
                break
            except Exception as e:
                print(f"❌ Error in monitoring loop: {e}")
                time.sleep(interval_seconds)
        
        self.running = False
    
    def stop_monitoring(self):
        """Stop the monitoring loop"""
        self.running = False

def signal_handler(sig, frame):
    """Handle shutdown signals gracefully"""
    print(f"\n🛑 Received signal {sig}, shutting down...")
    sys.exit(0)

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Predictive Anomaly Detection & Self-Healing")
    parser.add_argument("--daemon", action="store_true", help="Run as daemon")
    parser.add_argument("--interval", type=int, default=60, help="Monitoring interval in seconds")
    parser.add_argument("--check", action="store_true", help="Run single check")
    parser.add_argument("--stats", action="store_true", help="Show anomaly statistics")
    parser.add_argument("--reset", action="store_true", help="Reset baselines")
    
    args = parser.parse_args()
    
    # Set up signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    detector = AnomalyDetector()
    
    if args.reset:
        print("🔄 Resetting baselines...")
        conn = sqlite3.connect(str(ANOMALY_DB))
        conn.execute("DELETE FROM baselines")
        conn.execute("DELETE FROM metrics_history WHERE timestamp < ?", (time.time() - 3600,))
        conn.commit()
        conn.close()
        print("✅ Baselines reset")
        
    elif args.stats:
        conn = sqlite3.connect(str(ANOMALY_DB))
        
        # Anomaly stats
        cursor = conn.execute("""
            SELECT severity, COUNT(*) 
            FROM anomalies 
            WHERE detected_at > ? 
            GROUP BY severity
        """, (time.time() - 86400,))
        
        severity_counts = dict(cursor.fetchall())
        
        # Recent metrics
        cursor = conn.execute("SELECT COUNT(DISTINCT metric_name) FROM metrics_history")
        metric_count = cursor.fetchone()[0]
        
        # Healing stats
        healing_stats = {}
        if HEALING_LOG.exists():
            with open(HEALING_LOG, 'r') as f:
                healing_entries = [json.loads(line) for line in f if line.strip()]
            
            recent_healings = [h for h in healing_entries 
                             if datetime.fromisoformat(h["timestamp"].replace("Z", "+00:00")).timestamp() > time.time() - 86400]
            
            healing_stats = {
                "total_actions": len(recent_healings),
                "successful_actions": sum(1 for h in recent_healings if h["healing_action"]["success"])
            }
        
        conn.close()
        
        print("📊 Anomaly Detection Statistics (24h):")
        print(f"  🔍 Metrics monitored: {metric_count}")
        print(f"  🚨 Anomalies detected: {sum(severity_counts.values())}")
        for severity, count in sorted(severity_counts.items()):
            severity_name = ["", "Low", "Medium", "High", "Critical"][severity]
            print(f"    {severity_name}: {count}")
        print(f"  🔧 Healing actions: {healing_stats.get('total_actions', 0)} ({healing_stats.get('successful_actions', 0)} successful)")
        
    elif args.check:
        print("🔍 Running single anomaly check...")
        
        # Update baselines first
        detector.update_baselines()
        
        # Collect and analyze current metrics
        metrics_data = detector.collect_system_metrics()
        detector.store_metrics(metrics_data)
        
        anomalies = detector.detect_anomalies(metrics_data)
        
        if anomalies:
            print(f"🚨 Found {len(anomalies)} anomalies:")
            for anomaly in anomalies:
                print(f"  {anomaly['metric_name']}: {anomaly['anomaly_type']} (severity {anomaly['severity']})")
                print(f"    Current: {anomaly['current_value']:.2f}, Expected: {anomaly['expected_value']:.2f}")
        else:
            print("✅ No anomalies detected")
            
    elif args.daemon:
        print("🚀 Starting anomaly detection daemon...")
        detector.monitoring_loop(args.interval)
        
    else:
        print("Usage: anomaly_healer.py --daemon | --check | --stats | --reset")

if __name__ == "__main__":
    main()