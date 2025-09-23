#!/usr/bin/env python3
"""
Predictive Scaling and Cost Optimization Engine
Uses ML and historical patterns to predict resource needs and optimize costs
"""

import json
import time
import math
import statistics
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import sqlite3
import asyncio
import subprocess

class PredictiveScaler:
    def __init__(self):
        self.db_path = Path("logs/scaling.db")
        self.predictions_path = Path("cache/predictions.json")
        self.ensure_database()
        self.load_scaling_models()
    
    def ensure_database(self):
        """Create scaling analytics database"""
        self.db_path.parent.mkdir(exist_ok=True)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Resource usage patterns
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS resource_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                hour_of_day INTEGER,
                day_of_week INTEGER,
                cpu_percent REAL,
                memory_percent REAL,
                active_tasks INTEGER,
                queue_depth INTEGER,
                model_load_local INTEGER,
                model_load_cloud INTEGER,
                cost_per_hour REAL DEFAULT 0.0
            )
        ''')
        
        # Demand predictions
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS demand_predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                prediction_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                target_hour DATETIME,
                predicted_cpu REAL,
                predicted_memory REAL,
                predicted_tasks INTEGER,
                predicted_cost REAL,
                confidence_score REAL,
                actual_cpu REAL,
                actual_memory REAL,
                actual_tasks INTEGER,
                actual_cost REAL,
                prediction_accuracy REAL
            )
        ''')
        
        # Cost optimization events
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cost_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                event_type TEXT, -- scale_up, scale_down, model_switch, defer_task
                reason TEXT,
                cost_before REAL,
                cost_after REAL,
                savings_usd REAL,
                performance_impact REAL, -- -100 to +100
                success BOOLEAN DEFAULT TRUE
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def record_resource_usage(self):
        """Record current resource usage for pattern analysis"""
        try:
            import psutil
            
            now = datetime.now()
            cpu = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory().percent
            
            # Count active tasks (simplified)
            active_tasks = self.count_active_symphony_tasks()
            queue_depth = self.estimate_queue_depth()
            
            # Model load estimation
            local_load, cloud_load = self.estimate_model_load()
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO resource_usage 
                (hour_of_day, day_of_week, cpu_percent, memory_percent, 
                 active_tasks, queue_depth, model_load_local, model_load_cloud)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                now.hour, now.weekday(), cpu, memory,
                active_tasks, queue_depth, local_load, cloud_load
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            print(f"Error recording resource usage: {e}")
    
    def count_active_symphony_tasks(self) -> int:
        """Count active Symphony tasks"""
        try:
            result = subprocess.run(
                ["watson", "status"], 
                capture_output=True, 
                text=True,
                timeout=3
            )
            if result.returncode == 0 and "symphony:" in result.stdout:
                return 1
            return 0
        except:
            return 0
    
    def estimate_queue_depth(self) -> int:
        """Estimate task queue depth (simplified)"""
        # In a real implementation, this would check actual queue systems
        # For now, estimate based on system load
        try:
            import psutil
            load_avg = psutil.getloadavg()[0] if hasattr(psutil, 'getloadavg') else 0
            # Rough estimation: high load suggests queued work
            return max(0, int(load_avg - 1))
        except:
            return 0
    
    def estimate_model_load(self) -> Tuple[int, int]:
        """Estimate local vs cloud model usage"""
        try:
            # Check if local models are responding (indicates usage)
            import requests
            local_load = 0
            cloud_load = 0
            
            # Quick health check to local models
            try:
                resp = requests.get("http://127.0.0.1:4000/v1/models", timeout=2)
                if resp.status_code == 200:
                    models = resp.json().get("data", [])
                    local_models = [m for m in models if m["id"].startswith("local/")]
                    local_load = len(local_models)
            except:
                pass
            
            # Cloud load estimation (would need API integration)
            # For now, assume minimal cloud usage
            cloud_load = 0
            
            return local_load, cloud_load
        except:
            return 0, 0
    
    def load_scaling_models(self):
        """Load or create predictive models"""
        self.models = {
            "cpu_predictor": self.create_simple_predictor("cpu"),
            "memory_predictor": self.create_simple_predictor("memory"),
            "task_predictor": self.create_simple_predictor("tasks"),
            "cost_predictor": self.create_simple_predictor("cost")
        }
    
    def create_simple_predictor(self, metric_type: str):
        """Create a simple time-series predictor"""
        return {
            "type": metric_type,
            "patterns": {},  # hour_of_day -> [values]
            "trends": {},    # day_of_week -> trend_slope
            "confidence": 0.5,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
    
    def update_predictive_models(self):
        """Update predictive models with recent data"""
        conn = sqlite3.connect(self.db_path)
        
        # Get last 7 days of data
        query = '''
            SELECT hour_of_day, day_of_week, cpu_percent, memory_percent, 
                   active_tasks, cost_per_hour
            FROM resource_usage 
            WHERE timestamp > datetime('now', '-7 days')
            ORDER BY timestamp
        '''
        
        cursor = conn.cursor()
        cursor.execute(query)
        data = cursor.fetchall()
        conn.close()
        
        if len(data) < 10:
            return  # Need more data
        
        # Update hourly patterns
        hourly_patterns = {}
        for hour in range(24):
            hour_data = [row for row in data if row[0] == hour]
            if hour_data:
                hourly_patterns[hour] = {
                    "cpu": [row[2] for row in hour_data],
                    "memory": [row[3] for row in hour_data],
                    "tasks": [row[4] for row in hour_data],
                    "cost": [row[5] for row in hour_data]
                }
        
        # Update models
        for metric in ["cpu", "memory", "tasks", "cost"]:
            self.models[f"{metric}_predictor"]["patterns"] = {
                str(hour): statistics.mean(patterns[metric]) if patterns[metric] else 0
                for hour, patterns in hourly_patterns.items()
            }
            
            # Calculate confidence based on data consistency
            all_values = []
            for patterns in hourly_patterns.values():
                if patterns[metric]:
                    all_values.extend(patterns[metric])
            
            if len(all_values) > 1:
                confidence = 1.0 / (1.0 + statistics.stdev(all_values) / (statistics.mean(all_values) + 1))
                self.models[f"{metric}_predictor"]["confidence"] = min(0.9, max(0.1, confidence))
    
    def predict_resource_needs(self, hours_ahead: int = 1) -> Dict:
        """Predict resource needs for future time periods"""
        target_time = datetime.now() + timedelta(hours=hours_ahead)
        target_hour = target_time.hour
        target_day = target_time.weekday()
        
        predictions = {}
        
        for metric in ["cpu", "memory", "tasks", "cost"]:
            predictor = self.models[f"{metric}_predictor"]
            patterns = predictor["patterns"]
            confidence = predictor["confidence"]
            
            if str(target_hour) in patterns:
                base_prediction = patterns[str(target_hour)]
            else:
                # Use overall average if no pattern for this hour
                base_prediction = statistics.mean(patterns.values()) if patterns else 50
            
            # Add some randomness and trend adjustment
            trend_factor = 1.0  # Could be enhanced with actual trend analysis
            noise_factor = 0.1 * (1 - confidence)  # More noise for low confidence
            
            predicted_value = base_prediction * trend_factor * (1 + noise_factor)
            
            predictions[metric] = {
                "value": predicted_value,
                "confidence": confidence,
                "base_pattern": base_prediction,
                "trend_adjustment": trend_factor
            }
        
        # Overall system prediction
        predictions["summary"] = {
            "target_time": target_time.isoformat(),
            "hours_ahead": hours_ahead,
            "overall_confidence": statistics.mean([p["confidence"] for p in predictions.values() if isinstance(p, dict)]),
            "predicted_load_category": self.classify_predicted_load(predictions),
            "recommendations": self.generate_scaling_recommendations(predictions)
        }
        
        return predictions
    
    def classify_predicted_load(self, predictions: Dict) -> str:
        """Classify predicted load as low/medium/high"""
        cpu_pred = predictions.get("cpu", {}).get("value", 50)
        memory_pred = predictions.get("memory", {}).get("value", 50)
        tasks_pred = predictions.get("tasks", {}).get("value", 1)
        
        # Weighted scoring
        load_score = (cpu_pred * 0.4) + (memory_pred * 0.3) + (min(tasks_pred * 20, 100) * 0.3)
        
        if load_score < 30:
            return "low"
        elif load_score < 70:
            return "medium"
        else:
            return "high"
    
    def generate_scaling_recommendations(self, predictions: Dict) -> List[Dict]:
        """Generate actionable scaling recommendations"""
        recommendations = []
        
        cpu_pred = predictions.get("cpu", {}).get("value", 50)
        memory_pred = predictions.get("memory", {}).get("value", 50)
        tasks_pred = predictions.get("tasks", {}).get("value", 1)
        cost_pred = predictions.get("cost", {}).get("value", 0)
        
        # High resource usage predictions
        if cpu_pred > 80 or memory_pred > 85:
            recommendations.append({
                "type": "resource_alert",
                "priority": "high",
                "action": "prepare_for_high_load",
                "description": f"High resource usage predicted: CPU {cpu_pred:.1f}%, Memory {memory_pred:.1f}%",
                "suggestions": [
                    "Consider deferring non-critical tasks",
                    "Pre-warm cloud model connections",
                    "Monitor for federation offloading opportunities"
                ]
            })
        
        # Cost optimization opportunities
        if cost_pred > 0.50:  # More than 50 cents predicted
            recommendations.append({
                "type": "cost_optimization",
                "priority": "medium",
                "action": "optimize_cloud_usage",
                "description": f"High cloud costs predicted: ${cost_pred:.2f}",
                "suggestions": [
                    "Review cloud model necessity",
                    "Consider local model alternatives",
                    "Schedule expensive tasks for off-peak hours"
                ]
            })
        
        # Low utilization predictions
        if cpu_pred < 20 and memory_pred < 30 and tasks_pred < 1:
            recommendations.append({
                "type": "efficiency",
                "priority": "low",
                "action": "optimize_idle_time",
                "description": "Low utilization predicted - opportunity for batch processing",
                "suggestions": [
                    "Schedule RAG index updates",
                    "Perform model pre-loading",
                    "Run maintenance tasks"
                ]
            })
        
        # Task queue predictions
        if tasks_pred > 3:
            recommendations.append({
                "type": "capacity",
                "priority": "high",
                "action": "scale_out",
                "description": f"High task volume predicted: {tasks_pred:.1f} concurrent tasks",
                "suggestions": [
                    "Prepare federation peers for load sharing",
                    "Consider task prioritization",
                    "Monitor queue depth closely"
                ]
            })
        
        return recommendations
    
    def optimize_costs_realtime(self) -> Dict:
        """Real-time cost optimization decisions"""
        current_metrics = self.get_current_metrics()
        predictions = self.predict_resource_needs(1)  # Next hour
        
        optimizations = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "current_state": current_metrics,
            "predictions": predictions,
            "optimizations_applied": [],
            "potential_savings": 0.0
        }
        
        # Optimization 1: Model switching
        if current_metrics.get("memory_percent", 0) > 80:
            optimization = {
                "type": "model_switch",
                "action": "switch_to_cpu_optimized",
                "reason": "High memory pressure detected",
                "estimated_savings": 0.0,  # Performance savings, not cost
                "performance_impact": -5,  # Slight performance reduction
                "command": "Switch to local/llama-cpu for new tasks"
            }
            optimizations["optimizations_applied"].append(optimization)
        
        # Optimization 2: Task deferring
        predicted_load = predictions["summary"]["predicted_load_category"]
        if predicted_load == "low" and current_metrics.get("active_tasks", 0) > 0:
            optimization = {
                "type": "task_scheduling",
                "action": "defer_batch_tasks",
                "reason": "Low utilization period predicted",
                "estimated_savings": 0.10,  # Avoid cloud usage
                "performance_impact": 0,
                "command": "Schedule batch tasks for predicted low-load period"
            }
            optimizations["optimizations_applied"].append(optimization)
            optimizations["potential_savings"] += 0.10
        
        # Optimization 3: Federation load balancing
        if current_metrics.get("cpu_percent", 0) > 75:
            optimization = {
                "type": "federation",
                "action": "offload_to_peers",
                "reason": "Local system under high load",
                "estimated_savings": 0.0,
                "performance_impact": 10,  # Performance improvement
                "command": "Distribute tasks to federation peers"
            }
            optimizations["optimizations_applied"].append(optimization)
        
        return optimizations
    
    def get_current_metrics(self) -> Dict:
        """Get current system metrics"""
        try:
            import psutil
            return {
                "cpu_percent": psutil.cpu_percent(interval=1),
                "memory_percent": psutil.virtual_memory().percent,
                "load_avg": psutil.getloadavg()[0] if hasattr(psutil, 'getloadavg') else 0,
                "active_tasks": self.count_active_symphony_tasks(),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            return {"error": str(e), "timestamp": datetime.now(timezone.utc).isoformat()}
    
    def save_predictions_cache(self, predictions: Dict):
        """Save predictions to cache for dashboard"""
        self.predictions_path.parent.mkdir(exist_ok=True)
        
        cache_data = {
            "predictions": predictions,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        }
        
        with open(self.predictions_path, "w") as f:
            json.dump(cache_data, f, indent=2)
    
    def load_predictions_cache(self) -> Optional[Dict]:
        """Load cached predictions if still valid"""
        if not self.predictions_path.exists():
            return None
        
        try:
            with open(self.predictions_path) as f:
                cache_data = json.load(f)
            
            expires_at = datetime.fromisoformat(cache_data["expires_at"].replace("Z", "+00:00"))
            if datetime.now(timezone.utc) < expires_at:
                return cache_data["predictions"]
        except Exception:
            pass
        
        return None
    
    def generate_scaling_report(self) -> Dict:
        """Generate comprehensive scaling and cost optimization report"""
        # Update models with latest data
        self.update_predictive_models()
        
        # Generate predictions
        predictions_1h = self.predict_resource_needs(1)
        predictions_4h = self.predict_resource_needs(4)
        predictions_24h = self.predict_resource_needs(24)
        
        # Get current optimization opportunities
        optimizations = self.optimize_costs_realtime()
        
        # Historical performance
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT AVG(cpu_percent), AVG(memory_percent), AVG(active_tasks), SUM(cost_per_hour)
            FROM resource_usage 
            WHERE timestamp > datetime('now', '-24 hours')
        ''')
        
        historical_data = cursor.fetchone()
        conn.close()
        
        report = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "current_metrics": self.get_current_metrics(),
            "predictions": {
                "1_hour": predictions_1h,
                "4_hours": predictions_4h,
                "24_hours": predictions_24h
            },
            "optimizations": optimizations,
            "historical_summary": {
                "avg_cpu_24h": historical_data[0] if historical_data[0] else 0,
                "avg_memory_24h": historical_data[1] if historical_data[1] else 0,
                "avg_tasks_24h": historical_data[2] if historical_data[2] else 0,
                "total_cost_24h": historical_data[3] if historical_data[3] else 0
            },
            "model_confidence": {
                model_name: model["confidence"] 
                for model_name, model in self.models.items()
            }
        }
        
        # Cache predictions for dashboard
        self.save_predictions_cache(report["predictions"])
        
        return report

def main():
    import sys
    
    scaler = PredictiveScaler()
    
    if len(sys.argv) < 2:
        print("Usage: predictive_scaler.py [record|predict|optimize|report|monitor]")
        return
    
    command = sys.argv[1]
    
    if command == "record":
        print("Recording current resource usage...")
        scaler.record_resource_usage()
        print("✅ Resource usage recorded")
    
    elif command == "predict":
        hours = int(sys.argv[2]) if len(sys.argv) > 2 else 1
        predictions = scaler.predict_resource_needs(hours)
        print(json.dumps(predictions, indent=2))
    
    elif command == "optimize":
        optimizations = scaler.optimize_costs_realtime()
        print(json.dumps(optimizations, indent=2))
    
    elif command == "report":
        report = scaler.generate_scaling_report()
        print(json.dumps(report, indent=2))
    
    elif command == "monitor":
        print("🔍 Starting predictive scaling monitor...")
        while True:
            try:
                # Record usage every minute
                scaler.record_resource_usage()
                
                # Update predictions every 15 minutes
                if datetime.now().minute % 15 == 0:
                    scaler.update_predictive_models()
                    predictions = scaler.predict_resource_needs(1)
                    print(f"Predictions updated: {predictions['summary']['predicted_load_category']} load expected")
                
                time.sleep(60)  # Check every minute
                
            except KeyboardInterrupt:
                print("\n🛑 Monitoring stopped")
                break
            except Exception as e:
                print(f"Monitor error: {e}")
                time.sleep(60)

if __name__ == "__main__":
    main()