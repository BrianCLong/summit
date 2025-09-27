#!/usr/bin/env python3
"""
Real-Time Graph Intelligence with Neo4j Streaming
Live graph analysis, pattern detection, and intelligence synthesis
"""
import json, os, sys, time, threading, queue, sqlite3
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Callable
import subprocess
import socket
import hashlib

ROOT = Path(__file__).resolve().parent.parent
GRAPH_DB = ROOT / "data" / "graph_streaming.db"
STREAM_LOG = ROOT / "logs" / "graph_stream.jsonl"
ANALYSIS_CACHE = ROOT / "cache" / "graph_analysis"

class GraphStreamer:
    def __init__(self):
        self.ensure_dirs()
        self.init_db()
        self.running = False
        self.event_queue = queue.Queue()
        self.analysis_threads = []
        self.pattern_detectors = {}
        self.load_pattern_detectors()
        
    def ensure_dirs(self):
        """Ensure required directories exist"""
        for path in [GRAPH_DB.parent, STREAM_LOG.parent, ANALYSIS_CACHE]:
            path.mkdir(parents=True, exist_ok=True)
    
    def init_db(self):
        """Initialize graph streaming database"""
        conn = sqlite3.connect(str(GRAPH_DB))
        
        # Live graph events
        conn.execute("""
            CREATE TABLE IF NOT EXISTS graph_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL NOT NULL,
                event_type TEXT NOT NULL, -- node_created, node_updated, relationship_created, etc.
                entity_type TEXT, -- User, Document, etc.
                entity_id TEXT,
                event_data TEXT NOT NULL, -- JSON event payload
                source TEXT DEFAULT 'neo4j_stream',
                processed BOOLEAN DEFAULT FALSE
            )
        """)
        
        # Pattern detection results
        conn.execute("""
            CREATE TABLE IF NOT EXISTS pattern_detections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                detected_at REAL NOT NULL,
                pattern_type TEXT NOT NULL, -- community, anomaly, trend, etc.
                pattern_data TEXT NOT NULL, -- JSON with pattern details
                confidence_score REAL NOT NULL,
                entities_involved TEXT, -- JSON array of entity IDs
                significance_score REAL DEFAULT 0.5,
                alert_triggered BOOLEAN DEFAULT FALSE
            )
        """)
        
        # Intelligence synthesis results
        conn.execute("""
            CREATE TABLE IF NOT EXISTS intelligence_insights (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                generated_at REAL NOT NULL,
                insight_type TEXT NOT NULL, -- relationship_emergence, cluster_formation, etc.
                insight_data TEXT NOT NULL, -- JSON with insights
                supporting_patterns TEXT, -- JSON array of pattern IDs
                actionable_recommendations TEXT, -- JSON array
                confidence_level REAL NOT NULL,
                priority_score INTEGER DEFAULT 1 -- 1=low, 2=medium, 3=high, 4=urgent
            )
        """)
        
        # Graph metrics timeline
        conn.execute("""
            CREATE TABLE IF NOT EXISTS graph_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL NOT NULL,
                metric_name TEXT NOT NULL,
                metric_value REAL NOT NULL,
                metric_metadata TEXT DEFAULT '{}'
            )
        """)
        
        # Create indexes
        conn.execute("CREATE INDEX IF NOT EXISTS idx_events_timestamp ON graph_events(timestamp)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_events_type ON graph_events(event_type)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_patterns_detected ON pattern_detections(detected_at)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_insights_generated ON intelligence_insights(generated_at)")
        
        conn.commit()
        conn.close()
    
    def load_pattern_detectors(self):
        """Load pattern detection algorithms"""
        self.pattern_detectors = {
            "community_detection": self.detect_community_formation,
            "anomaly_detection": self.detect_graph_anomalies,
            "trend_analysis": self.analyze_graph_trends,
            "centrality_shifts": self.detect_centrality_changes,
            "relationship_emergence": self.detect_new_relationships,
            "clustering_evolution": self.analyze_cluster_evolution
        }
    
    def check_neo4j_connection(self) -> bool:
        """Check if Neo4j is available"""
        try:
            result = subprocess.run([
                "curl", "-s", "-X", "GET", "http://localhost:7474/db/data/"
            ], capture_output=True, text=True, timeout=10)
            return result.returncode == 0
        except:
            return False
    
    def execute_cypher_query(self, query: str, parameters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute Cypher query against Neo4j"""
        try:
            # Create cypher-shell command
            cmd = [
                "cypher-shell", "-u", "neo4j", "-p", "password", "--format", "json"
            ]
            
            # Format query with parameters if provided
            if parameters:
                for key, value in parameters.items():
                    if isinstance(value, str):
                        query = query.replace(f"${key}", f"'{value}'")
                    else:
                        query = query.replace(f"${key}", str(value))
            
            result = subprocess.run(
                cmd,
                input=query,
                text=True,
                capture_output=True,
                timeout=30
            )
            
            if result.returncode == 0:
                # Parse JSON response
                lines = result.stdout.strip().split('\n')
                results = []
                for line in lines:
                    if line.strip():
                        try:
                            results.append(json.loads(line))
                        except:
                            continue
                return {"success": True, "data": results}
            else:
                return {"success": False, "error": result.stderr}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def collect_graph_metrics(self) -> Dict[str, Any]:
        """Collect comprehensive graph metrics"""
        metrics = {}
        timestamp = time.time()
        
        # Basic graph statistics
        queries = {
            "node_count": "MATCH (n) RETURN count(n) as count",
            "relationship_count": "MATCH ()-[r]->() RETURN count(r) as count",
            "node_types": "MATCH (n) RETURN labels(n) as labels, count(n) as count",
            "relationship_types": "MATCH ()-[r]->() RETURN type(r) as type, count(r) as count"
        }
        
        for metric_name, query in queries.items():
            result = self.execute_cypher_query(query)
            if result["success"]:
                if metric_name in ["node_count", "relationship_count"]:
                    if result["data"]:
                        metrics[metric_name] = result["data"][0].get("count", 0)
                else:
                    metrics[metric_name] = result["data"]
        
        # Advanced graph metrics
        advanced_queries = {
            "avg_degree": """
                MATCH (n)
                OPTIONAL MATCH (n)-[r]-()
                WITH n, count(r) as degree
                RETURN avg(degree) as avg_degree
            """,
            "max_degree": """
                MATCH (n)
                OPTIONAL MATCH (n)-[r]-()
                WITH n, count(r) as degree
                RETURN max(degree) as max_degree
            """,
            "connected_components": """
                CALL gds.graph.drop('temp-graph', false)
                CALL gds.graph.project('temp-graph', '*', '*')
                CALL gds.wcc.stream('temp-graph')
                YIELD componentId
                RETURN count(DISTINCT componentId) as component_count
            """,
            "clustering_coefficient": """
                MATCH (n)-[:CONNECTED_TO]-(m), (n)-[:CONNECTED_TO]-(o), (m)-[:CONNECTED_TO]-(o)
                WHERE id(n) > id(m) AND id(m) > id(o)
                WITH count(*) as triangles
                MATCH (n)-[:CONNECTED_TO]-(m)
                WITH triangles, count(*) as total_pairs
                RETURN 3.0 * triangles / total_pairs as clustering_coefficient
            """
        }
        
        for metric_name, query in advanced_queries.items():
            try:
                result = self.execute_cypher_query(query)
                if result["success"] and result["data"]:
                    metrics[metric_name] = result["data"][0].get(metric_name.split('_')[-1], 0)
            except:
                metrics[metric_name] = 0  # Graceful fallback
        
        return {"timestamp": timestamp, "metrics": metrics}
    
    def store_graph_metrics(self, metrics_data: Dict[str, Any]):
        """Store graph metrics in database"""
        conn = sqlite3.connect(str(GRAPH_DB))
        
        timestamp = metrics_data["timestamp"]
        metrics = metrics_data["metrics"]
        
        for metric_name, value in metrics.items():
            if isinstance(value, (int, float)):
                conn.execute("""
                    INSERT INTO graph_metrics (timestamp, metric_name, metric_value, metric_metadata)
                    VALUES (?, ?, ?, ?)
                """, (timestamp, metric_name, float(value), "{}"))
            elif isinstance(value, list):
                # Store aggregate information for list metrics
                conn.execute("""
                    INSERT INTO graph_metrics (timestamp, metric_name, metric_value, metric_metadata)
                    VALUES (?, ?, ?, ?)
                """, (timestamp, f"{metric_name}_count", len(value), json.dumps({"sample": value[:5]})))
        
        conn.commit()
        conn.close()
    
    def simulate_graph_events(self) -> List[Dict[str, Any]]:
        """Simulate graph events for demonstration (replace with real Neo4j CDC)"""
        import random
        
        events = []
        timestamp = time.time()
        
        # Simulate different types of graph events
        event_types = [
            "node_created", "node_updated", "node_deleted",
            "relationship_created", "relationship_updated", "relationship_deleted"
        ]
        
        entity_types = ["User", "Document", "Organization", "Project", "Task"]
        
        # Generate 1-5 random events
        for _ in range(random.randint(1, 5)):
            event_type = random.choice(event_types)
            entity_type = random.choice(entity_types)
            entity_id = f"{entity_type.lower()}_{random.randint(1000, 9999)}"
            
            event_data = {
                "entity_type": entity_type,
                "entity_id": entity_id,
                "timestamp": timestamp,
                "properties": {
                    "name": f"Sample {entity_type} {random.randint(1, 100)}",
                    "updated_at": timestamp
                }
            }
            
            if event_type.startswith("relationship"):
                event_data["source_id"] = f"user_{random.randint(1000, 9999)}"
                event_data["target_id"] = entity_id
                event_data["relationship_type"] = random.choice(["OWNS", "WORKS_ON", "COLLABORATES_WITH", "MANAGES"])
            
            events.append({
                "event_type": event_type,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "event_data": event_data,
                "timestamp": timestamp
            })
        
        return events
    
    def process_graph_events(self, events: List[Dict[str, Any]]):
        """Process incoming graph events"""
        conn = sqlite3.connect(str(GRAPH_DB))
        
        for event in events:
            # Store event
            conn.execute("""
                INSERT INTO graph_events (timestamp, event_type, entity_type, entity_id, event_data, processed)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                event["timestamp"], event["event_type"], event["entity_type"],
                event["entity_id"], json.dumps(event["event_data"]), False
            ))
            
            # Queue for pattern analysis
            self.event_queue.put(event)
        
        conn.commit()
        conn.close()
    
    # Pattern Detection Functions
    def detect_community_formation(self, recent_events: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Detect emerging communities in the graph"""
        # Analyze relationship creation events
        relationship_events = [e for e in recent_events if e["event_type"] == "relationship_created"]
        
        if len(relationship_events) < 3:
            return None
        
        # Simple community detection based on clustering of new relationships
        entity_connections = {}
        for event in relationship_events:
            event_data = event["event_data"]
            source = event_data.get("source_id")
            target = event_data.get("target_id")
            
            if source and target:
                if source not in entity_connections:
                    entity_connections[source] = set()
                if target not in entity_connections:
                    entity_connections[target] = set()
                
                entity_connections[source].add(target)
                entity_connections[target].add(source)
        
        # Find dense clusters
        clusters = []
        processed = set()
        
        for entity, connections in entity_connections.items():
            if entity in processed:
                continue
            
            # Find connected component
            cluster = {entity}
            to_visit = [entity]
            
            while to_visit:
                current = to_visit.pop()
                processed.add(current)
                
                for neighbor in entity_connections.get(current, []):
                    if neighbor not in cluster:
                        cluster.add(neighbor)
                        to_visit.append(neighbor)
            
            if len(cluster) >= 3:  # Minimum cluster size
                clusters.append(list(cluster))
        
        if clusters:
            return {
                "pattern_type": "community_formation",
                "clusters": clusters,
                "cluster_count": len(clusters),
                "total_entities": sum(len(c) for c in clusters),
                "confidence": min(0.9, len(relationship_events) / 10)
            }
        
        return None
    
    def detect_graph_anomalies(self, recent_events: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Detect anomalous patterns in graph changes"""
        # Analyze event frequency and types
        event_counts = {}
        entity_activity = {}
        
        for event in recent_events:
            event_type = event["event_type"]
            entity_id = event["entity_id"]
            
            event_counts[event_type] = event_counts.get(event_type, 0) + 1
            entity_activity[entity_id] = entity_activity.get(entity_id, 0) + 1
        
        anomalies = []
        
        # Detect high-frequency entities (potential bots or anomalous behavior)
        avg_activity = sum(entity_activity.values()) / len(entity_activity) if entity_activity else 0
        for entity_id, activity_count in entity_activity.items():
            if activity_count > avg_activity * 3:  # 3x average
                anomalies.append({
                    "type": "high_activity_entity",
                    "entity_id": entity_id,
                    "activity_count": activity_count,
                    "average_activity": avg_activity
                })
        
        # Detect unusual event type distributions
        total_events = sum(event_counts.values())
        for event_type, count in event_counts.items():
            frequency = count / total_events
            if frequency > 0.7:  # One type dominates
                anomalies.append({
                    "type": "event_type_dominance",
                    "event_type": event_type,
                    "frequency": frequency,
                    "count": count
                })
        
        if anomalies:
            return {
                "pattern_type": "graph_anomalies",
                "anomalies": anomalies,
                "anomaly_count": len(anomalies),
                "confidence": min(0.8, len(anomalies) / 5)
            }
        
        return None
    
    def analyze_graph_trends(self, recent_events: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Analyze trends in graph evolution"""
        if len(recent_events) < 5:
            return None
        
        # Group events by time windows
        events_by_time = {}
        window_size = 300  # 5 minutes
        
        for event in recent_events:
            window = int(event["timestamp"] // window_size)
            if window not in events_by_time:
                events_by_time[window] = []
            events_by_time[window].append(event)
        
        if len(events_by_time) < 2:
            return None
        
        # Analyze growth trends
        windows = sorted(events_by_time.keys())
        trends = {}
        
        for i in range(1, len(windows)):
            prev_window = windows[i-1]
            curr_window = windows[i]
            
            prev_count = len(events_by_time[prev_window])
            curr_count = len(events_by_time[curr_window])
            
            if prev_count > 0:
                growth_rate = (curr_count - prev_count) / prev_count
                trends[curr_window] = {
                    "event_count": curr_count,
                    "growth_rate": growth_rate
                }
        
        # Identify significant trends
        if trends:
            avg_growth = sum(t["growth_rate"] for t in trends.values()) / len(trends)
            
            return {
                "pattern_type": "graph_trends",
                "avg_growth_rate": avg_growth,
                "time_windows": len(trends),
                "trend_direction": "increasing" if avg_growth > 0.1 else "decreasing" if avg_growth < -0.1 else "stable",
                "confidence": min(0.7, len(trends) / 10)
            }
        
        return None
    
    def detect_centrality_changes(self, recent_events: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Detect changes in node centrality/importance"""
        # This is a simplified version - in production, would use actual centrality algorithms
        entity_connections = {}
        
        for event in recent_events:
            if event["event_type"] in ["relationship_created", "relationship_deleted"]:
                event_data = event["event_data"]
                source = event_data.get("source_id")
                target = event_data.get("target_id")
                
                if source:
                    entity_connections[source] = entity_connections.get(source, 0) + 1
                if target:
                    entity_connections[target] = entity_connections.get(target, 0) + 1
        
        if not entity_connections:
            return None
        
        # Find entities with high connection activity
        max_connections = max(entity_connections.values())
        avg_connections = sum(entity_connections.values()) / len(entity_connections)
        
        high_centrality_entities = [
            (entity, connections) for entity, connections in entity_connections.items()
            if connections > avg_connections * 2
        ]
        
        if high_centrality_entities:
            return {
                "pattern_type": "centrality_changes",
                "high_centrality_entities": high_centrality_entities,
                "max_connections": max_connections,
                "avg_connections": avg_connections,
                "confidence": min(0.8, len(high_centrality_entities) / 5)
            }
        
        return None
    
    def detect_new_relationships(self, recent_events: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Detect emergence of new relationship patterns"""
        relationship_events = [e for e in recent_events if e["event_type"] == "relationship_created"]
        
        if len(relationship_events) < 3:
            return None
        
        # Analyze relationship types
        relationship_types = {}
        entity_pairs = set()
        
        for event in relationship_events:
            event_data = event["event_data"]
            rel_type = event_data.get("relationship_type", "UNKNOWN")
            source = event_data.get("source_id")
            target = event_data.get("target_id")
            
            relationship_types[rel_type] = relationship_types.get(rel_type, 0) + 1
            
            if source and target:
                entity_pairs.add((min(source, target), max(source, target)))
        
        # Find dominant relationship types
        total_rels = sum(relationship_types.values())
        dominant_types = [
            (rel_type, count) for rel_type, count in relationship_types.items()
            if count > total_rels * 0.3  # More than 30% of new relationships
        ]
        
        if dominant_types:
            return {
                "pattern_type": "relationship_emergence",
                "dominant_relationship_types": dominant_types,
                "total_new_relationships": total_rels,
                "unique_entity_pairs": len(entity_pairs),
                "confidence": min(0.9, total_rels / 10)
            }
        
        return None
    
    def analyze_cluster_evolution(self, recent_events: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Analyze how graph clusters are evolving"""
        # This would integrate with actual graph clustering algorithms
        # For now, simulate based on entity type distributions
        
        entity_types = {}
        for event in recent_events:
            entity_type = event.get("entity_type", "Unknown")
            entity_types[entity_type] = entity_types.get(entity_type, 0) + 1
        
        if not entity_types or len(entity_types) < 2:
            return None
        
        total_entities = sum(entity_types.values())
        type_distribution = {
            etype: count / total_entities 
            for etype, count in entity_types.items()
        }
        
        # Calculate diversity (entropy-like measure)
        diversity = -sum(p * math.log2(p) for p in type_distribution.values() if p > 0)
        
        return {
            "pattern_type": "cluster_evolution",
            "entity_type_distribution": type_distribution,
            "diversity_score": diversity,
            "total_entities": total_entities,
            "confidence": min(0.7, total_entities / 20)
        }
    
    def run_pattern_detection(self, lookback_minutes: int = 30):
        """Run all pattern detectors on recent events"""
        conn = sqlite3.connect(str(GRAPH_DB))
        
        # Get recent events
        cutoff_time = time.time() - (lookback_minutes * 60)
        cursor = conn.execute("""
            SELECT event_type, entity_type, entity_id, event_data, timestamp
            FROM graph_events
            WHERE timestamp > ?
            ORDER BY timestamp DESC
        """, (cutoff_time,))
        
        recent_events = []
        for row in cursor.fetchall():
            event_type, entity_type, entity_id, event_data, timestamp = row
            recent_events.append({
                "event_type": event_type,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "event_data": json.loads(event_data),
                "timestamp": timestamp
            })
        
        if not recent_events:
            conn.close()
            return []
        
        print(f"🔍 Running pattern detection on {len(recent_events)} recent events...")
        
        detected_patterns = []
        
        # Run each pattern detector
        for detector_name, detector_func in self.pattern_detectors.items():
            try:
                pattern = detector_func(recent_events)
                if pattern:
                    pattern["detector"] = detector_name
                    pattern["detected_at"] = time.time()
                    detected_patterns.append(pattern)
                    
                    # Store in database
                    conn.execute("""
                        INSERT INTO pattern_detections 
                        (detected_at, pattern_type, pattern_data, confidence_score, 
                         entities_involved, significance_score)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        pattern["detected_at"],
                        pattern["pattern_type"],
                        json.dumps(pattern),
                        pattern.get("confidence", 0.5),
                        json.dumps([]),  # Would extract entity IDs in production
                        pattern.get("confidence", 0.5)  # Use confidence as significance for now
                    ))
                    
                    print(f"  ✅ {detector_name}: {pattern['pattern_type']} (confidence: {pattern.get('confidence', 0.5):.2f})")
            
            except Exception as e:
                print(f"  ❌ {detector_name} failed: {e}")
        
        conn.commit()
        conn.close()
        
        return detected_patterns
    
    def generate_intelligence_insights(self, patterns: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate actionable intelligence from detected patterns"""
        if not patterns:
            return {"insights": [], "recommendations": []}
        
        insights = []
        recommendations = []
        
        # Analyze pattern combinations
        pattern_types = [p["pattern_type"] for p in patterns]
        
        # Community + Centrality insights
        if "community_formation" in pattern_types and "centrality_changes" in pattern_types:
            insights.append({
                "type": "network_restructuring",
                "description": "The network is undergoing significant restructuring with new communities forming and centrality shifts",
                "confidence": 0.8,
                "priority": 3
            })
            recommendations.append("Monitor key entities for potential leadership changes or organizational shifts")
        
        # Anomaly insights
        anomaly_patterns = [p for p in patterns if p["pattern_type"] == "graph_anomalies"]
        if anomaly_patterns:
            anomaly_count = sum(len(p.get("anomalies", [])) for p in anomaly_patterns)
            insights.append({
                "type": "anomalous_activity",
                "description": f"Detected {anomaly_count} anomalous patterns in graph activity",
                "confidence": max(p.get("confidence", 0) for p in anomaly_patterns),
                "priority": 4 if anomaly_count > 5 else 3
            })
            recommendations.append("Investigate high-activity entities for potential security or data quality issues")
        
        # Growth trends
        trend_patterns = [p for p in patterns if p["pattern_type"] == "graph_trends"]
        if trend_patterns:
            for trend in trend_patterns:
                direction = trend.get("trend_direction", "unknown")
                if direction == "increasing":
                    insights.append({
                        "type": "growth_acceleration",
                        "description": "Graph is experiencing accelerated growth in connections and entities",
                        "confidence": trend.get("confidence", 0.5),
                        "priority": 2
                    })
                    recommendations.append("Prepare for increased system load and consider scaling infrastructure")
        
        # Generate synthesis using AI
        if insights:
            synthesis_prompt = f"""
            Analyze these graph intelligence patterns and provide strategic insights:
            
            Detected Patterns: {len(patterns)}
            Key Insights: {[i['description'] for i in insights[:3]]}
            
            Provide strategic recommendations for network analysis and intelligence gathering.
            """
            
            try:
                cmd = [
                    "python3", str(ROOT / "tools" / "ask_with_pack.py"),
                    "research", synthesis_prompt
                ]
                
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                if result.returncode == 0:
                    ai_synthesis = result.stdout.strip()
                    insights.append({
                        "type": "ai_synthesis",
                        "description": ai_synthesis,
                        "confidence": 0.7,
                        "priority": 2
                    })
            except:
                pass
        
        # Store insights
        conn = sqlite3.connect(str(GRAPH_DB))
        insight_data = {
            "insights": insights,
            "recommendations": recommendations,
            "pattern_count": len(patterns)
        }
        
        conn.execute("""
            INSERT INTO intelligence_insights 
            (generated_at, insight_type, insight_data, supporting_patterns, 
             actionable_recommendations, confidence_level, priority_score)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            time.time(),
            "multi_pattern_analysis",
            json.dumps(insight_data),
            json.dumps([p.get("pattern_type") for p in patterns]),
            json.dumps(recommendations),
            max([i.get("confidence", 0) for i in insights], default=0.5),
            max([i.get("priority", 1) for i in insights], default=1)
        ))
        
        conn.commit()
        conn.close()
        
        return insight_data
    
    def streaming_loop(self, interval_seconds: int = 30):
        """Main streaming analysis loop"""
        print(f"🌊 Starting graph streaming loop (interval: {interval_seconds}s)")
        self.running = True
        
        import math
        
        while self.running:
            try:
                # Check Neo4j connectivity
                if not self.check_neo4j_connection():
                    print("⚠️  Neo4j not available, using simulated events")
                
                # Collect graph metrics
                metrics_data = self.collect_graph_metrics()
                self.store_graph_metrics(metrics_data)
                
                # Simulate/collect graph events (replace with real CDC in production)
                events = self.simulate_graph_events()
                if events:
                    self.process_graph_events(events)
                    print(f"📊 Processed {len(events)} graph events")
                
                # Run pattern detection
                patterns = self.run_pattern_detection()
                
                if patterns:
                    print(f"🔍 Detected {len(patterns)} patterns")
                    
                    # Generate intelligence insights
                    insights = self.generate_intelligence_insights(patterns)
                    
                    if insights["insights"]:
                        print(f"🧠 Generated {len(insights['insights'])} intelligence insights")
                        for insight in insights["insights"][:3]:  # Show top 3
                            priority_emoji = ["", "📘", "🔶", "🔴", "💀"][insight.get("priority", 1)]
                            print(f"  {priority_emoji} {insight['type']}: {insight['description'][:100]}...")
                
                else:
                    # Quiet mode - only show status periodically
                    if int(time.time()) % 300 == 0:  # Every 5 minutes
                        node_count = metrics_data["metrics"].get("node_count", 0)
                        rel_count = metrics_data["metrics"].get("relationship_count", 0)
                        print(f"📈 Graph status: {node_count} nodes, {rel_count} relationships")
                
                time.sleep(interval_seconds)
                
            except KeyboardInterrupt:
                print("\n🛑 Streaming stopped by user")
                break
            except Exception as e:
                print(f"❌ Error in streaming loop: {e}")
                time.sleep(interval_seconds)
        
        self.running = False

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Real-Time Graph Intelligence")
    parser.add_argument("--stream", action="store_true", help="Start streaming analysis")
    parser.add_argument("--interval", type=int, default=30, help="Analysis interval in seconds")
    parser.add_argument("--patterns", action="store_true", help="Run pattern detection once")
    parser.add_argument("--metrics", action="store_true", help="Collect graph metrics")
    parser.add_argument("--stats", action="store_true", help="Show streaming statistics")
    
    args = parser.parse_args()
    
    streamer = GraphStreamer()
    
    if args.metrics:
        print("📊 Collecting graph metrics...")
        metrics = streamer.collect_graph_metrics()
        streamer.store_graph_metrics(metrics)
        
        print(f"Graph Metrics:")
        for metric_name, value in metrics["metrics"].items():
            if isinstance(value, (int, float)):
                print(f"  {metric_name}: {value}")
            else:
                print(f"  {metric_name}: {type(value).__name__} ({len(value) if hasattr(value, '__len__') else 'N/A'})")
    
    elif args.patterns:
        print("🔍 Running pattern detection...")
        patterns = streamer.run_pattern_detection()
        
        if patterns:
            print(f"Detected {len(patterns)} patterns:")
            for pattern in patterns:
                print(f"  {pattern['pattern_type']}: confidence {pattern.get('confidence', 0):.2f}")
            
            # Generate insights
            insights = streamer.generate_intelligence_insights(patterns)
            print(f"\nGenerated {len(insights['insights'])} insights:")
            for insight in insights['insights']:
                print(f"  {insight['type']}: {insight['description'][:150]}...")
        else:
            print("No patterns detected")
    
    elif args.stats:
        conn = sqlite3.connect(str(GRAPH_DB))
        
        # Event stats
        cursor = conn.execute("SELECT COUNT(*) FROM graph_events")
        event_count = cursor.fetchone()[0]
        
        # Pattern stats
        cursor = conn.execute("SELECT pattern_type, COUNT(*) FROM pattern_detections GROUP BY pattern_type")
        pattern_stats = dict(cursor.fetchall())
        
        # Insight stats
        cursor = conn.execute("SELECT COUNT(*) FROM intelligence_insights")
        insight_count = cursor.fetchone()[0]
        
        conn.close()
        
        print("📊 Graph Streaming Statistics:")
        print(f"  📈 Graph events processed: {event_count}")
        print(f"  🔍 Patterns detected:")
        for pattern_type, count in pattern_stats.items():
            print(f"    {pattern_type}: {count}")
        print(f"  🧠 Intelligence insights: {insight_count}")
    
    elif args.stream:
        try:
            streamer.streaming_loop(args.interval)
        except KeyboardInterrupt:
            print("\n🛑 Streaming stopped")
    
    else:
        print("Usage: graph_streaming.py --stream | --patterns | --metrics | --stats")

if __name__ == "__main__":
    main()