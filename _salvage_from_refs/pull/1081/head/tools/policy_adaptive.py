#!/usr/bin/env python3
"""
Autonomous Policy Adaptation Engine
Self-learns from performance patterns and dynamically adjusts orchestration policies
"""
import json, os, sys, sqlite3, time, math, statistics
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import yaml

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "config" / "orchestration.yml" 
POLICY_DB = ROOT / "data" / "policy_adaptation.db"
LEARNING_LOG = ROOT / "logs" / "policy_learning.jsonl"

class PolicyEngine:
    def __init__(self):
        self.ensure_dirs()
        self.init_db()
        
    def ensure_dirs(self):
        """Ensure required directories exist"""
        for path in [POLICY_DB.parent, LEARNING_LOG.parent]:
            path.mkdir(parents=True, exist_ok=True)
    
    def init_db(self):
        """Initialize policy learning database"""
        conn = sqlite3.connect(str(POLICY_DB))
        conn.execute("""
            CREATE TABLE IF NOT EXISTS policy_performance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL NOT NULL,
                policy_set TEXT NOT NULL,
                provider TEXT NOT NULL,
                task_type TEXT NOT NULL,
                success_rate REAL NOT NULL,
                avg_latency_ms REAL,
                cost_per_token REAL,
                tokens_per_second REAL,
                error_rate REAL DEFAULT 0.0,
                user_satisfaction REAL DEFAULT 0.5,
                context_factors TEXT -- JSON blob
            )
        """)
        
        conn.execute("""
            CREATE TABLE IF NOT EXISTS policy_adaptations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL NOT NULL,
                old_policy TEXT NOT NULL,
                new_policy TEXT NOT NULL,
                reason TEXT NOT NULL,
                confidence REAL NOT NULL,
                expected_improvement REAL,
                actual_improvement REAL,
                validation_period_end REAL
            )
        """)
        
        conn.execute("""
            CREATE TABLE IF NOT EXISTS performance_baselines (
                provider TEXT NOT NULL,
                task_type TEXT NOT NULL,
                metric_name TEXT NOT NULL,
                baseline_value REAL NOT NULL,
                last_updated REAL NOT NULL,
                sample_count INTEGER DEFAULT 1,
                PRIMARY KEY (provider, task_type, metric_name)
            )
        """)
        
        conn.commit()
        conn.close()
    
    def load_current_policy(self) -> Dict[str, Any]:
        """Load current orchestration policy"""
        if CONFIG_PATH.exists():
            with open(CONFIG_PATH, 'r') as f:
                return yaml.safe_load(f) or {}
        return self.get_default_policy()
    
    def get_default_policy(self) -> Dict[str, Any]:
        """Generate intelligent default policy"""
        return {
            "routing": {
                "default_strategy": "capability_weighted",
                "fallback_chain": ["local/llama", "openrouter/qwen"],
                "retry_logic": {
                    "max_attempts": 3,
                    "backoff_multiplier": 1.5,
                    "circuit_breaker_threshold": 0.7
                }
            },
            "performance_thresholds": {
                "max_latency_ms": 15000,
                "min_success_rate": 0.85,
                "max_cost_per_1k_tokens": 0.02,
                "max_error_rate": 0.15
            },
            "adaptation": {
                "learning_rate": 0.1,
                "confidence_threshold": 0.8,
                "validation_window_hours": 6,
                "min_samples_for_decision": 20
            },
            "autonomy": {
                "max_loa": 2,  # Level of Autonomy cap
                "human_approval_required": False,
                "auto_rollback_enabled": True,
                "safety_rails": True
            }
        }
    
    def collect_performance_metrics(self) -> List[Dict[str, Any]]:
        """Collect recent performance data from various sources"""
        metrics = []
        
        # From burndown data
        burndown_path = ROOT / "status" / "burndown.json"
        if burndown_path.exists():
            with open(burndown_path, 'r') as f:
                data = json.load(f)
                
            for window in ["m1", "h1"]:
                window_data = data.get("windows", {}).get(window, {})
                for model, stats in window_data.get("per_model", {}).items():
                    if stats["req"] > 0:  # Only models with activity
                        metrics.append({
                            "timestamp": time.time(),
                            "provider": model.split("/")[0] if "/" in model else "local",
                            "model": model,
                            "requests": stats["req"],
                            "avg_latency_ms": stats.get("p50_ms"),
                            "p95_latency_ms": stats.get("p95_ms"),
                            "tokens": stats["tokens"],
                            "cost_usd": stats["cost_usd"],
                            "window": window
                        })
        
        # From ML optimizer historical data  
        ml_db = ROOT / "data" / "ml_optimization.db"
        if ml_db.exists():
            conn = sqlite3.connect(str(ml_db))
            cursor = conn.execute("""
                SELECT provider, task, avg_duration_ms, success_rate, cost_estimate, timestamp
                FROM task_performance 
                WHERE timestamp > ? 
                ORDER BY timestamp DESC LIMIT 100
            """, (time.time() - 3600,))  # Last hour
            
            for row in cursor.fetchall():
                provider, task, duration, success_rate, cost, ts = row
                metrics.append({
                    "timestamp": ts,
                    "provider": provider,
                    "task_type": task,
                    "avg_duration_ms": duration,
                    "success_rate": success_rate,
                    "cost_estimate": cost,
                    "source": "ml_optimizer"
                })
            conn.close()
        
        return metrics
    
    def analyze_performance_trends(self, metrics: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze performance trends and identify optimization opportunities"""
        analysis = {
            "provider_performance": {},
            "task_performance": {},
            "trend_analysis": {},
            "optimization_opportunities": []
        }
        
        # Group by provider
        provider_stats = {}
        for metric in metrics:
            provider = metric.get("provider", "unknown")
            if provider not in provider_stats:
                provider_stats[provider] = {
                    "latencies": [], "success_rates": [], "costs": [], "requests": 0
                }
            
            if metric.get("avg_latency_ms"):
                provider_stats[provider]["latencies"].append(metric["avg_latency_ms"])
            if metric.get("success_rate"):
                provider_stats[provider]["success_rates"].append(metric["success_rate"])
            if metric.get("cost_usd"):
                provider_stats[provider]["costs"].append(metric["cost_usd"])
            provider_stats[provider]["requests"] += metric.get("requests", 1)
        
        # Calculate provider performance scores
        for provider, stats in provider_stats.items():
            score = 1.0
            issues = []
            
            if stats["latencies"]:
                avg_latency = statistics.mean(stats["latencies"])
                if avg_latency > 10000:  # 10s threshold
                    score *= 0.7
                    issues.append(f"High latency: {avg_latency:.0f}ms")
            
            if stats["success_rates"]:
                avg_success = statistics.mean(stats["success_rates"])
                if avg_success < 0.85:
                    score *= 0.5
                    issues.append(f"Low success rate: {avg_success:.2%}")
            
            analysis["provider_performance"][provider] = {
                "score": score,
                "avg_latency_ms": statistics.mean(stats["latencies"]) if stats["latencies"] else None,
                "avg_success_rate": statistics.mean(stats["success_rates"]) if stats["success_rates"] else None,
                "total_requests": stats["requests"],
                "issues": issues
            }
            
            # Identify optimization opportunities
            if score < 0.8:
                analysis["optimization_opportunities"].append({
                    "type": "provider_performance",
                    "provider": provider,
                    "score": score,
                    "issues": issues,
                    "recommended_action": "reduce_traffic" if score < 0.5 else "monitor_closely"
                })
        
        return analysis
    
    def generate_policy_adaptations(self, analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate intelligent policy adaptations based on analysis"""
        adaptations = []
        current_policy = self.load_current_policy()
        
        # Adaptation 1: Adjust provider priorities based on performance
        provider_scores = analysis.get("provider_performance", {})
        if provider_scores:
            # Sort providers by performance score
            sorted_providers = sorted(provider_scores.items(), key=lambda x: x[1]["score"], reverse=True)
            
            # Generate new fallback chain
            new_fallback = [provider for provider, data in sorted_providers if data["score"] > 0.6]
            current_fallback = current_policy.get("routing", {}).get("fallback_chain", [])
            
            if new_fallback != current_fallback and len(new_fallback) >= 2:
                adaptations.append({
                    "type": "routing_optimization",
                    "change": {
                        "path": "routing.fallback_chain",
                        "old_value": current_fallback,
                        "new_value": new_fallback
                    },
                    "reason": f"Performance-based reordering: {sorted_providers[0][0]} performing best",
                    "confidence": 0.85,
                    "expected_improvement": 0.15
                })
        
        # Adaptation 2: Adjust performance thresholds based on observed patterns
        for opportunity in analysis.get("optimization_opportunities", []):
            if opportunity["type"] == "provider_performance":
                provider = opportunity["provider"]
                
                if "High latency" in str(opportunity.get("issues", [])):
                    # Increase max latency threshold for this provider
                    adaptations.append({
                        "type": "threshold_adjustment",
                        "change": {
                            "path": f"provider_overrides.{provider}.max_latency_ms",
                            "old_value": None,
                            "new_value": 20000  # More lenient threshold
                        },
                        "reason": f"Provider {provider} consistently exceeds latency threshold",
                        "confidence": 0.7,
                        "expected_improvement": 0.1
                    })
        
        # Adaptation 3: Circuit breaker adjustment
        low_performers = [p for p, data in provider_scores.items() if data["score"] < 0.5]
        if low_performers:
            adaptations.append({
                "type": "circuit_breaker",
                "change": {
                    "path": "routing.retry_logic.circuit_breaker_threshold",
                    "old_value": current_policy.get("routing", {}).get("retry_logic", {}).get("circuit_breaker_threshold", 0.7),
                    "new_value": 0.8  # More aggressive circuit breaking
                },
                "reason": f"Multiple providers underperforming: {low_performers}",
                "confidence": 0.9,
                "expected_improvement": 0.2
            })
        
        return adaptations
    
    def evaluate_adaptation_safety(self, adaptation: Dict[str, Any]) -> Tuple[bool, str]:
        """Evaluate if an adaptation is safe to apply"""
        current_policy = self.load_current_policy()
        max_loa = current_policy.get("autonomy", {}).get("max_loa", 2)
        
        # LOA 0: No autonomous changes
        if max_loa == 0:
            return False, "LOA 0: Autonomous adaptations disabled"
        
        # LOA 1: Only safe, reversible changes
        if max_loa == 1:
            safe_types = ["threshold_adjustment", "circuit_breaker"]
            if adaptation["type"] not in safe_types:
                return False, f"LOA 1: {adaptation['type']} not in safe types"
        
        # LOA 2: More significant changes allowed
        if max_loa == 2:
            if adaptation["confidence"] < 0.7:
                return False, f"LOA 2: Confidence {adaptation['confidence']} below threshold 0.7"
        
        # LOA 3: Aggressive adaptations (not implemented for safety)
        
        return True, "Adaptation approved"
    
    def apply_adaptation(self, adaptation: Dict[str, Any]) -> bool:
        """Apply a policy adaptation"""
        try:
            current_policy = self.load_current_policy()
            change = adaptation["change"]
            path_parts = change["path"].split(".")
            
            # Navigate to the nested dict location
            target = current_policy
            for part in path_parts[:-1]:
                if part not in target:
                    target[part] = {}
                target = target[part]
            
            # Apply the change
            old_value = target.get(path_parts[-1])
            target[path_parts[-1]] = change["new_value"]
            
            # Save updated policy
            CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
            with open(CONFIG_PATH, 'w') as f:
                yaml.dump(current_policy, f, default_flow_style=False, indent=2)
            
            # Log the adaptation
            self.log_adaptation(adaptation, old_value)
            
            return True
            
        except Exception as e:
            self.log_error(f"Failed to apply adaptation: {e}")
            return False
    
    def log_adaptation(self, adaptation: Dict[str, Any], actual_old_value: Any):
        """Log policy adaptation for tracking and rollback"""
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "type": adaptation["type"],
            "change_path": adaptation["change"]["path"],
            "old_value": actual_old_value,
            "new_value": adaptation["change"]["new_value"],
            "reason": adaptation["reason"],
            "confidence": adaptation["confidence"],
            "expected_improvement": adaptation.get("expected_improvement"),
            "validation_end": (datetime.now(timezone.utc) + timedelta(hours=6)).isoformat()
        }
        
        LEARNING_LOG.parent.mkdir(parents=True, exist_ok=True)
        with open(LEARNING_LOG, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')
    
    def log_error(self, message: str):
        """Log error to learning log"""
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "type": "error",
            "message": message
        }
        
        LEARNING_LOG.parent.mkdir(parents=True, exist_ok=True)
        with open(LEARNING_LOG, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')
    
    def run_adaptation_cycle(self):
        """Run complete adaptation cycle"""
        print("🧠 Starting autonomous policy adaptation cycle...")
        
        # 1. Collect performance metrics
        print("📊 Collecting performance metrics...")
        metrics = self.collect_performance_metrics()
        print(f"   Collected {len(metrics)} performance data points")
        
        # 2. Analyze trends
        print("🔍 Analyzing performance trends...")
        analysis = self.analyze_performance_trends(metrics)
        
        provider_count = len(analysis["provider_performance"])
        opportunity_count = len(analysis["optimization_opportunities"])
        print(f"   Analyzed {provider_count} providers, found {opportunity_count} optimization opportunities")
        
        # 3. Generate adaptations
        print("🎯 Generating policy adaptations...")
        adaptations = self.generate_policy_adaptations(analysis)
        print(f"   Generated {len(adaptations)} potential adaptations")
        
        # 4. Evaluate and apply safe adaptations
        applied_count = 0
        for adaptation in adaptations:
            is_safe, reason = self.evaluate_adaptation_safety(adaptation)
            
            if is_safe:
                print(f"✅ Applying adaptation: {adaptation['type']} ({adaptation['confidence']:.1%} confidence)")
                if self.apply_adaptation(adaptation):
                    applied_count += 1
                    print(f"   ✓ {adaptation['reason']}")
                else:
                    print(f"   ✗ Failed to apply adaptation")
            else:
                print(f"⚠️  Skipping unsafe adaptation: {adaptation['type']} - {reason}")
        
        print(f"🎭 Policy adaptation complete: {applied_count}/{len(adaptations)} adaptations applied")
        
        # 5. Generate summary report
        summary = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metrics_collected": len(metrics),
            "providers_analyzed": provider_count,
            "opportunities_found": opportunity_count,
            "adaptations_generated": len(adaptations),
            "adaptations_applied": applied_count,
            "top_performers": sorted(
                analysis["provider_performance"].items(), 
                key=lambda x: x[1]["score"], 
                reverse=True
            )[:3] if analysis["provider_performance"] else []
        }
        
        # Write summary
        summary_path = ROOT / "status" / "policy_adaptation.json"
        with open(summary_path, 'w') as f:
            json.dump(summary, f, indent=2)
        
        return summary

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--daemon":
        # Daemon mode: run continuously
        engine = PolicyEngine()
        while True:
            try:
                engine.run_adaptation_cycle()
                time.sleep(3600)  # Run every hour
            except KeyboardInterrupt:
                print("\n🛑 Daemon mode stopped")
                break
            except Exception as e:
                print(f"❌ Error in adaptation cycle: {e}")
                time.sleep(300)  # Wait 5 minutes before retry
    else:
        # Single run mode
        engine = PolicyEngine()
        summary = engine.run_adaptation_cycle()
        
        if summary["adaptations_applied"] > 0:
            print(f"\n🎉 Successfully adapted {summary['adaptations_applied']} policies")
            if summary["top_performers"]:
                top_performer = summary["top_performers"][0]
                print(f"🏆 Top performer: {top_performer[0]} (score: {top_performer[1]['score']:.2f})")

if __name__ == "__main__":
    main()