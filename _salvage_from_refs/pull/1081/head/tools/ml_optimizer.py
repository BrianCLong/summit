#!/usr/bin/env python3
"""
ML-Driven Symphony Optimization Engine
Uses historical performance data to optimize routing and predict resource needs
"""

import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import sqlite3
import pickle

class SymphonyMLOptimizer:
    def __init__(self):
        self.db_path = Path("logs/performance.db")
        self.model_path = Path("models/symphony_optimizer.pkl")
        self.ensure_database()
        self.load_models()
    
    def ensure_database(self):
        """Create performance tracking database"""
        self.db_path.parent.mkdir(exist_ok=True)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Performance metrics table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS performance_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                job_type TEXT NOT NULL,
                provider TEXT NOT NULL,
                duration_seconds REAL,
                cpu_percent_avg REAL,
                memory_percent_avg REAL,
                load_avg REAL,
                battery_plugged BOOLEAN,
                loa_level INTEGER,
                success BOOLEAN DEFAULT TRUE,
                cost_usd REAL DEFAULT 0.0,
                tokens_used INTEGER DEFAULT 0,
                context_length INTEGER DEFAULT 0
            )
        ''')
        
        # Route optimization table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS route_decisions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                job_type TEXT NOT NULL,
                chosen_provider TEXT NOT NULL,
                alternative_providers TEXT,  -- JSON array
                decision_factors TEXT,       -- JSON object
                performance_score REAL,     -- 0-100
                cost_effectiveness REAL,    -- performance/cost ratio
                user_satisfaction INTEGER   -- 1-5 rating if available
            )
        ''')
        
        # Predictive features table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS predictive_features (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                hour_of_day INTEGER,
                day_of_week INTEGER,
                system_load_category TEXT, -- low/medium/high
                recent_job_count INTEGER,
                avg_recent_duration REAL,
                predicted_duration REAL,
                actual_duration REAL,
                prediction_accuracy REAL
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def record_performance(self, job_type: str, provider: str, duration: float, 
                          system_metrics: Dict, loa_level: int, success: bool = True,
                          cost_usd: float = 0.0, tokens_used: int = 0):
        """Record performance metrics for ML training"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO performance_metrics 
            (job_type, provider, duration_seconds, cpu_percent_avg, memory_percent_avg,
             load_avg, battery_plugged, loa_level, success, cost_usd, tokens_used)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            job_type, provider, duration,
            system_metrics.get("cpu_percent", 0),
            system_metrics.get("memory_percent", 0),
            system_metrics.get("load_avg_1m", 0),
            system_metrics.get("battery", {}).get("plugged", True),
            loa_level, success, cost_usd, tokens_used
        ))
        
        conn.commit()
        conn.close()
    
    def record_route_decision(self, job_type: str, chosen_provider: str,
                            alternatives: List[str], factors: Dict,
                            performance_score: float, cost_effectiveness: float):
        """Record routing decisions for optimization analysis"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO route_decisions
            (job_type, chosen_provider, alternative_providers, decision_factors,
             performance_score, cost_effectiveness)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            job_type, chosen_provider, json.dumps(alternatives),
            json.dumps(factors), performance_score, cost_effectiveness
        ))
        
        conn.commit()
        conn.close()
    
    def get_performance_data(self, job_type: Optional[str] = None, 
                           days_back: int = 30) -> pd.DataFrame:
        """Retrieve performance data for analysis"""
        conn = sqlite3.connect(self.db_path)
        
        query = '''
            SELECT * FROM performance_metrics 
            WHERE timestamp > datetime('now', '-{} days')
        '''.format(days_back)
        
        if job_type:
            query += f" AND job_type = '{job_type}'"
        
        query += " ORDER BY timestamp"
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        return df
    
    def predict_duration(self, job_type: str, system_metrics: Dict) -> float:
        """ML prediction of task duration based on historical data"""
        # Get historical data
        df = self.get_performance_data(job_type, days_back=14)
        
        if len(df) < 3:
            # Fallback to heuristic estimates
            defaults = {
                "smoke": 90, "health-check": 30, "rag-rebuild": 120,
                "neo4j-guard": 45, "embeddings": 180, "nl2cypher": 15,
                "code": 45, "research": 60, "long-cot": 300
            }
            return defaults.get(job_type, 60)
        
        # Feature engineering
        current_load = system_metrics.get("load_avg_1m", 0)
        current_memory = system_metrics.get("memory_percent", 0)
        current_hour = datetime.now().hour
        
        # Simple statistical model with load adjustment
        base_duration = df["duration_seconds"].median()
        
        # Load-based adjustment
        df_similar_load = df[
            (df["load_avg"] >= current_load * 0.8) & 
            (df["load_avg"] <= current_load * 1.2)
        ]
        
        if len(df_similar_load) >= 2:
            adjusted_duration = df_similar_load["duration_seconds"].mean()
        else:
            # Linear adjustment based on load
            load_factor = max(0.5, min(2.0, current_load / df["load_avg"].mean()))
            adjusted_duration = base_duration * load_factor
        
        # Memory pressure adjustment
        if current_memory > 80:
            adjusted_duration *= 1.2
        elif current_memory < 50:
            adjusted_duration *= 0.9
        
        # Time-of-day pattern (if enough data)
        if len(df) >= 10:
            df["hour"] = pd.to_datetime(df["timestamp"]).dt.hour
            hour_pattern = df.groupby("hour")["duration_seconds"].mean()
            if current_hour in hour_pattern.index:
                hour_factor = hour_pattern[current_hour] / df["duration_seconds"].mean()
                adjusted_duration *= hour_factor
        
        return max(5.0, adjusted_duration)  # Minimum 5 seconds
    
    def optimize_provider_selection(self, job_type: str, system_metrics: Dict) -> Dict[str, float]:
        """Score different providers for optimal selection"""
        providers = ["local/llama", "local/llama-cpu", "openai/gpt-4o-mini"]
        scores = {}
        
        # Get historical performance for each provider
        df = self.get_performance_data(job_type, days_back=14)
        
        for provider in providers:
            provider_data = df[df["provider"] == provider]
            
            if len(provider_data) == 0:
                # Default scoring for new providers
                if provider.startswith("local/"):
                    scores[provider] = 85.0  # Favor local
                else:
                    scores[provider] = 70.0  # Cloud penalty
                continue
            
            # Performance metrics
            avg_duration = provider_data["duration_seconds"].mean()
            success_rate = provider_data["success"].mean() * 100
            avg_cost = provider_data["cost_usd"].mean()
            
            # Base score from success rate
            score = success_rate
            
            # Duration penalty (prefer faster)
            if avg_duration > 60:
                score *= (1.0 - min(0.3, (avg_duration - 60) / 300))
            
            # Cost penalty
            if avg_cost > 0:
                score *= (1.0 - min(0.4, avg_cost / 0.10))  # Penalize >$0.10 tasks
            
            # System load consideration
            current_load = system_metrics.get("load_avg_1m", 0)
            if current_load > 2.0 and provider == "local/llama":
                score *= 0.8  # Reduce local model score under high load
            
            # Local preference bonus
            if provider.startswith("local/"):
                score *= 1.1
            
            scores[provider] = max(0, min(100, score))
        
        return scores
    
    def recommend_optimal_timing(self, job_type: str) -> Dict[str, any]:
        """Recommend optimal timing for batch jobs"""
        df = self.get_performance_data(job_type, days_back=21)
        
        if len(df) < 10:
            return {
                "recommendation": "insufficient_data",
                "optimal_hour": 2,  # Default to 2 AM
                "reasoning": "Default off-peak scheduling"
            }
        
        # Add hour column
        df["hour"] = pd.to_datetime(df["timestamp"]).dt.hour
        
        # Analyze performance by hour
        hourly_stats = df.groupby("hour").agg({
            "duration_seconds": ["mean", "std"],
            "cpu_percent_avg": "mean",
            "success": "mean"
        }).round(2)
        
        # Find optimal hours (low duration, high success rate, low CPU usage)
        hourly_stats.columns = ["duration_mean", "duration_std", "cpu_avg", "success_rate"]
        
        # Scoring: lower duration + higher success + lower CPU = better
        hourly_stats["score"] = (
            (100 - hourly_stats["duration_mean"].rank(pct=True) * 100) * 0.4 +
            (hourly_stats["success_rate"] * 100) * 0.4 +
            (100 - hourly_stats["cpu_avg"]) * 0.2
        )
        
        optimal_hour = hourly_stats["score"].idxmax()
        optimal_score = hourly_stats.loc[optimal_hour, "score"]
        
        # Determine recommendation strength
        current_hour = datetime.now().hour
        current_score = hourly_stats.loc[current_hour, "score"] if current_hour in hourly_stats.index else 50
        
        if optimal_score - current_score > 15:
            recommendation = "defer"
            reasoning = f"Performance {optimal_score-current_score:.1f}% better at {optimal_hour:02d}:00"
        elif optimal_score - current_score > 5:
            recommendation = "consider_defer"
            reasoning = f"Slightly better performance at {optimal_hour:02d}:00"
        else:
            recommendation = "proceed"
            reasoning = "Current timing is acceptable"
        
        return {
            "recommendation": recommendation,
            "optimal_hour": int(optimal_hour),
            "current_hour": current_hour,
            "score_difference": round(optimal_score - current_score, 1),
            "reasoning": reasoning,
            "optimal_score": round(optimal_score, 1)
        }
    
    def generate_insights(self) -> Dict[str, any]:
        """Generate ML-driven insights about Symphony performance"""
        insights = {
            "timestamp": datetime.utcnow().isoformat(),
            "performance_trends": {},
            "optimization_opportunities": [],
            "cost_efficiency": {},
            "predictive_accuracy": {}
        }
        
        # Overall performance trends
        df = self.get_performance_data(days_back=14)
        if len(df) > 0:
            insights["performance_trends"] = {
                "total_tasks": len(df),
                "avg_duration": round(df["duration_seconds"].mean(), 1),
                "success_rate": round(df["success"].mean() * 100, 1),
                "total_cost": round(df["cost_usd"].sum(), 2),
                "cost_per_task": round(df["cost_usd"].mean(), 4)
            }
            
            # Job type analysis
            job_stats = df.groupby("job_type").agg({
                "duration_seconds": "mean",
                "success": "mean",
                "cost_usd": "mean"
            }).round(2)
            
            insights["job_performance"] = job_stats.to_dict("index")
            
            # Provider efficiency
            provider_stats = df.groupby("provider").agg({
                "duration_seconds": "mean",
                "success": "mean",
                "cost_usd": "sum"
            }).round(2)
            
            insights["provider_efficiency"] = provider_stats.to_dict("index")
        
        # Optimization opportunities
        if len(df) >= 10:
            # Find slow jobs
            slow_jobs = df[df["duration_seconds"] > df["duration_seconds"].quantile(0.8)]
            if len(slow_jobs) > 0:
                insights["optimization_opportunities"].append({
                    "type": "slow_tasks",
                    "count": len(slow_jobs),
                    "job_types": slow_jobs["job_type"].value_counts().head(3).to_dict(),
                    "recommendation": "Consider optimizing these task types"
                })
            
            # Find high-cost operations
            expensive_ops = df[df["cost_usd"] > 0.01]
            if len(expensive_ops) > 0:
                insights["optimization_opportunities"].append({
                    "type": "high_cost",
                    "count": len(expensive_ops),
                    "total_cost": round(expensive_ops["cost_usd"].sum(), 2),
                    "recommendation": "Review necessity of cloud model usage"
                })
        
        return insights
    
    def load_models(self):
        """Load trained ML models if available"""
        self.models = {}
        if self.model_path.exists():
            try:
                with open(self.model_path, 'rb') as f:
                    self.models = pickle.load(f)
            except Exception as e:
                print(f"Warning: Could not load ML models: {e}")
    
    def save_models(self):
        """Save trained ML models"""
        self.model_path.parent.mkdir(exist_ok=True)
        try:
            with open(self.model_path, 'wb') as f:
                pickle.dump(self.models, f)
        except Exception as e:
            print(f"Warning: Could not save ML models: {e}")

def main():
    optimizer = SymphonyMLOptimizer()
    
    if len(sys.argv) < 2:
        print("Usage: ml_optimizer.py [insights|predict|optimize] [job_type]")
        return
    
    command = sys.argv[1]
    
    if command == "insights":
        insights = optimizer.generate_insights()
        print(json.dumps(insights, indent=2))
    
    elif command == "predict" and len(sys.argv) >= 3:
        job_type = sys.argv[2]
        system_metrics = {"load_avg_1m": 1.0, "memory_percent": 60, "cpu_percent": 40}
        duration = optimizer.predict_duration(job_type, system_metrics)
        print(f"Predicted duration for {job_type}: {duration:.1f} seconds")
    
    elif command == "optimize" and len(sys.argv) >= 3:
        job_type = sys.argv[2]
        system_metrics = {"load_avg_1m": 1.0, "memory_percent": 60, "cpu_percent": 40}
        scores = optimizer.optimize_provider_selection(job_type, system_metrics)
        print("Provider optimization scores:")
        for provider, score in sorted(scores.items(), key=lambda x: x[1], reverse=True):
            print(f"  {provider}: {score:.1f}")

if __name__ == "__main__":
    import sys
    main()