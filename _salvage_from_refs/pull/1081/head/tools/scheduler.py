#!/usr/bin/env python3
"""
Advanced Symphony Scheduler: ML-driven routing with predictive scaling
Integrates with Watson timing data for intelligent resource allocation
"""

import os
import sys
import json
import yaml
import time
import psutil
import subprocess
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional
import statistics

class IntelligentScheduler:
    def __init__(self):
        self.config = self.load_configs()
        self.performance_data = self.load_performance_history()
        self.system_metrics = self.get_system_metrics()
        
    def load_configs(self) -> Dict[str, Any]:
        """Load orchestration and capabilities configuration"""
        config = {}
        
        # Load orchestration.yml
        if Path("orchestration.yml").exists():
            with open("orchestration.yml") as f:
                config.update(yaml.safe_load(f) or {})
        
        # Load capabilities.yml if it exists
        capabilities_file = Path("capabilities.yml")
        if capabilities_file.exists():
            with open(capabilities_file) as f:
                caps = yaml.safe_load(f) or {}
                config["capabilities"] = caps
        else:
            # Create default capabilities
            default_caps = self.create_default_capabilities()
            config["capabilities"] = default_caps
            with open(capabilities_file, "w") as f:
                yaml.dump(default_caps, f, indent=2)
        
        return config
    
    def create_default_capabilities(self) -> Dict[str, Any]:
        """Generate intelligent default capabilities based on system"""
        cpu_count = psutil.cpu_count()
        memory_gb = round(psutil.virtual_memory().total / (1024**3))
        
        return {
            "nodes": {
                "local": {
                    "kind": "local",
                    "cpu_cores": cpu_count,
                    "ram_gb": memory_gb,
                    "preferred_jobs": ["interactive", "graph", "small-rag", "eval6"],
                    "offload_when": {"battery": "< 40%", "load": "> 0.75"}
                }
            },
            "providers": {
                "local/llama": {
                    "context_tokens": 8192,
                    "rpm": 120,
                    "tpm": 300000,
                    "cost_per_1k_out": 0.00
                },
                "local/llama-cpu": {
                    "context_tokens": 4096,
                    "rpm": 60,
                    "tpm": 150000,
                    "cost_per_1k_out": 0.00
                }
            },
            "budgets": {
                "daily_usd_cap": 5.00,
                "burst_windows": [
                    {
                        "name": "focus_hours",
                        "when": "09:00-17:00",
                        "allow_hosted": False,
                        "loa_max": 2
                    },
                    {
                        "name": "offpeak_batch",
                        "when": "18:00-08:00",
                        "allow_hosted": True,
                        "loa_max": 3,
                        "hosted_usd_cap": 2.00
                    }
                ]
            },
            "timeboxes": {
                "five_hour_context_reset": True,
                "cache_ttl_minutes": 120,
                "performance_learning": True
            }
        }
    
    def load_performance_history(self) -> Dict[str, Any]:
        """Load Watson timing data and system performance history"""
        perf_data = {"tasks": {}, "trends": {}}
        
        # Try to get Watson data
        try:
            # Get recent Watson logs
            result = subprocess.run(
                ["watson", "log", "--day"], 
                capture_output=True, 
                text=True, 
                timeout=5
            )
            if result.returncode == 0:
                perf_data["watson_today"] = result.stdout
                # Parse timing data for ML optimization
                perf_data["tasks"] = self.parse_watson_data(result.stdout)
        except Exception:
            pass
        
        # Load compute logs if available
        compute_log = Path("logs/compute.jsonl")
        if compute_log.exists():
            try:
                with open(compute_log) as f:
                    compute_data = [json.loads(line) for line in f if line.strip()]
                    perf_data["compute_history"] = compute_data[-50:]  # Last 50 entries
            except Exception:
                pass
        
        return perf_data
    
    def parse_watson_data(self, watson_output: str) -> Dict[str, List[float]]:
        """Extract task timings from Watson output for ML analysis"""
        tasks = {}
        lines = watson_output.strip().split('\n')
        
        for line in lines:
            if 'symphony:' in line:
                parts = line.split()
                if len(parts) >= 6:
                    duration_str = parts[5]
                    task_name = parts[6].replace('symphony:', '')
                    
                    # Convert duration to seconds
                    duration_seconds = self.parse_duration(duration_str)
                    if duration_seconds:
                        if task_name not in tasks:
                            tasks[task_name] = []
                        tasks[task_name].append(duration_seconds)
        
        return tasks
    
    def parse_duration(self, duration_str: str) -> Optional[float]:
        """Parse Watson duration strings to seconds"""
        try:
            if duration_str.endswith('s'):
                return float(duration_str[:-1])
            elif duration_str.endswith('m'):
                return float(duration_str[:-1]) * 60
            elif duration_str.endswith('h'):
                return float(duration_str[:-1]) * 3600
        except ValueError:
            pass
        return None
    
    def get_system_metrics(self) -> Dict[str, Any]:
        """Real-time system performance metrics"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            load_avg = os.getloadavg() if hasattr(os, 'getloadavg') else [0, 0, 0]
            
            # Battery status (macOS)
            battery_info = {"plugged": True, "percent": 100}
            try:
                result = subprocess.run(
                    ["pmset", "-g", "batt"], 
                    capture_output=True, 
                    text=True,
                    timeout=3
                )
                if result.returncode == 0:
                    output = result.stdout
                    battery_info["plugged"] = "AC Power" in output or "charged" in output
                    # Extract battery percentage if available
                    if "%" in output:
                        for line in output.split('\n'):
                            if '%' in line:
                                try:
                                    pct_start = line.find('\t') + 1
                                    pct_end = line.find('%')
                                    if pct_start > 0 and pct_end > pct_start:
                                        battery_info["percent"] = int(line[pct_start:pct_end])
                                    break
                                except:
                                    pass
            except Exception:
                pass
            
            return {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_available_gb": memory.available / (1024**3),
                "load_avg_1m": load_avg[0],
                "load_avg_5m": load_avg[1],
                "load_avg_15m": load_avg[2],
                "battery": battery_info,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            return {"error": str(e), "timestamp": datetime.now(timezone.utc).isoformat()}
    
    def is_in_time_window(self, window_spec: str) -> bool:
        """Check if current time is within specified window"""
        try:
            start_str, end_str = window_spec.split("-")
            now = datetime.now()
            current_time = now.strftime("%H:%M")
            
            if start_str <= end_str:
                # Same day window
                return start_str <= current_time <= end_str
            else:
                # Overnight window
                return current_time >= start_str or current_time <= end_str
        except Exception:
            return False
    
    def predict_task_duration(self, task: str) -> Optional[float]:
        """Use ML/statistical analysis to predict task duration"""
        task_history = self.performance_data.get("tasks", {}).get(task, [])
        
        if not task_history:
            # Default estimates based on task type
            defaults = {
                "smoke": 90,
                "health-check": 30,
                "rag-rebuild": 120,
                "neo4j-guard": 45,
                "embeddings": 180,
                "nl2cypher": 15
            }
            return defaults.get(task, 60)  # 1 minute default
        
        # Statistical prediction
        if len(task_history) >= 3:
            # Use trend analysis for prediction
            recent = task_history[-3:]
            if len(set(recent)) == 1:
                # Consistent performance
                return statistics.mean(recent)
            else:
                # Weighted average favoring recent performance
                weights = [1, 2, 3]  # Recent performance weighted more
                weighted_avg = sum(w * t for w, t in zip(weights, recent)) / sum(weights)
                return weighted_avg
        else:
            return statistics.mean(task_history)
    
    def assess_system_load(self) -> str:
        """Assess current system load: low, medium, high"""
        metrics = self.system_metrics
        
        cpu = metrics.get("cpu_percent", 0)
        memory = metrics.get("memory_percent", 0)
        load = metrics.get("load_avg_1m", 0)
        
        # Weighted scoring
        score = (cpu * 0.4) + (memory * 0.3) + (min(load * 25, 100) * 0.3)
        
        if score < 30:
            return "low"
        elif score < 70:
            return "medium"
        else:
            return "high"
    
    def should_offload_task(self, task: str) -> bool:
        """Determine if task should be offloaded based on system state"""
        metrics = self.system_metrics
        capabilities = self.config.get("capabilities", {})
        
        # Check battery and load conditions
        battery_info = metrics.get("battery", {})
        battery_low = battery_info.get("percent", 100) < 40
        not_plugged = not battery_info.get("plugged", True)
        high_load = self.assess_system_load() == "high"
        
        # Check offload conditions from config
        offload_conditions = capabilities.get("nodes", {}).get("local", {}).get("offload_when", {})
        
        should_offload = False
        
        if battery_low and not_plugged:
            should_offload = True
        elif high_load and task in ["embeddings", "batch-rag", "long-cot"]:
            should_offload = True
        
        return should_offload
    
    def make_routing_decision(self, job: str, loa: int = 1, env: str = "dev") -> Dict[str, Any]:
        """Make intelligent routing decision based on all factors"""
        decision = {
            "job": job,
            "loa": loa,
            "env": env,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "system_metrics": self.system_metrics,
            "predicted_duration": self.predict_task_duration(job),
            "system_load": self.assess_system_load(),
            "should_offload": self.should_offload_task(job)
        }
        
        # Check kill switch
        kill_switch = int(os.getenv("ORCHESTRA_KILL", "0"))
        if kill_switch:
            decision.update({
                "provider": "local/llama",
                "allow_hosted": False,
                "reasoning": "Kill switch activated",
                "status": "restricted"
            })
            return decision
        
        # Environment-based LOA caps
        env_loa_caps = {"dev": 3, "staging": 2, "prod": 1}
        max_loa = env_loa_caps.get(env, 1)
        effective_loa = min(loa, max_loa)
        
        # Time window analysis
        current_window = None
        capabilities = self.config.get("capabilities", {})
        for window in capabilities.get("budgets", {}).get("burst_windows", []):
            if self.is_in_time_window(window["when"]):
                current_window = window
                break
        
        # Default routing
        provider = "local/llama"
        allow_hosted = False
        
        # Job-specific routing
        job_routing = {
            "code": "local/llama-cpu",
            "nl2cypher": "local/llama", 
            "embeddings": "local/llama-cpu",
            "graph": "local/llama",
            "health-check": "local/llama-cpu"
        }
        
        provider = job_routing.get(job, provider)
        
        # Window-based overrides
        if current_window:
            if current_window.get("allow_hosted", False) and not self.should_offload_task(job):
                allow_hosted = True
                if job in ["long-cot", "research"] and effective_loa >= 2:
                    # Allow cloud models for complex reasoning in burst windows
                    provider = "openai/gpt-4o-mini"
        
        # Performance-based optimization
        predicted_time = decision["predicted_duration"]
        if predicted_time > 300 and self.assess_system_load() == "high":
            # Task predicted to take >5 minutes on high load system
            decision["recommendation"] = "Consider deferring to off-peak hours"
        
        decision.update({
            "provider": provider,
            "allow_hosted": allow_hosted,
            "effective_loa": effective_loa,
            "max_loa": max_loa,
            "current_window": current_window["name"] if current_window else None,
            "reasoning": self.generate_reasoning(job, provider, allow_hosted, current_window),
            "status": "allowed"
        })
        
        return decision
    
    def generate_reasoning(self, job: str, provider: str, allow_hosted: bool, window: Optional[Dict]) -> str:
        """Generate human-readable reasoning for routing decision"""
        reasons = []
        
        if provider.startswith("local/"):
            reasons.append("local-first policy")
        
        if window:
            reasons.append(f"in {window['name']} window")
        
        if allow_hosted:
            reasons.append("cloud models permitted")
        
        system_load = self.assess_system_load()
        if system_load != "low":
            reasons.append(f"system load: {system_load}")
        
        if self.should_offload_task(job):
            reasons.append("offload recommended")
        
        return "; ".join(reasons) if reasons else "standard routing"

def main():
    scheduler = IntelligentScheduler()
    
    # Parse command line arguments
    job = sys.argv[1] if len(sys.argv) > 1 else "interactive"
    loa = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    env = sys.argv[3] if len(sys.argv) > 3 else "dev"
    
    # Make routing decision
    decision = scheduler.make_routing_decision(job, loa, env)
    
    # Output decision as JSON
    print(json.dumps(decision, indent=2))

if __name__ == "__main__":
    main()