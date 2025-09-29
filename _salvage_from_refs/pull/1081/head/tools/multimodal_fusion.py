#!/usr/bin/env python3
"""
Multi-Modal Intelligence Fusion Engine
Combines text, audio, image, and structured data for enhanced AI analysis
"""
import json, os, sys, time, hashlib, base64, subprocess
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Union
from datetime import datetime, timezone
import sqlite3
import mimetypes

ROOT = Path(__file__).resolve().parent.parent
FUSION_DB = ROOT / "data" / "multimodal_fusion.db"
MEDIA_CACHE = ROOT / "cache" / "media"
PROCESSING_TEMP = ROOT / "tmp" / "multimodal"

class MultiModalProcessor:
    def __init__(self):
        self.ensure_dirs()
        self.init_db()
        self.load_processors()
        
    def ensure_dirs(self):
        """Ensure required directories exist"""
        for path in [FUSION_DB.parent, MEDIA_CACHE, PROCESSING_TEMP]:
            path.mkdir(parents=True, exist_ok=True)
    
    def init_db(self):
        """Initialize multi-modal database"""
        conn = sqlite3.connect(str(FUSION_DB))
        
        # Media assets
        conn.execute("""
            CREATE TABLE IF NOT EXISTS media_assets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filepath TEXT NOT NULL,
                filename TEXT NOT NULL,
                content_hash TEXT UNIQUE NOT NULL,
                mime_type TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                modality TEXT NOT NULL, -- text, image, audio, video, structured
                created_at REAL NOT NULL,
                metadata TEXT DEFAULT '{}',
                processing_status TEXT DEFAULT 'pending' -- pending, processing, completed, failed
            )
        """)
        
        # Extracted features from each modality
        conn.execute("""
            CREATE TABLE IF NOT EXISTS modality_features (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                asset_id INTEGER NOT NULL,
                feature_type TEXT NOT NULL, -- ocr_text, speech_text, image_objects, etc.
                feature_data TEXT NOT NULL, -- JSON blob with extracted features
                confidence_score REAL DEFAULT 0.0,
                extraction_method TEXT NOT NULL,
                extracted_at REAL NOT NULL,
                FOREIGN KEY (asset_id) REFERENCES media_assets (id)
            )
        """)
        
        # Cross-modal relationships and correlations
        conn.execute("""
            CREATE TABLE IF NOT EXISTS cross_modal_links (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                primary_asset_id INTEGER NOT NULL,
                related_asset_id INTEGER NOT NULL,
                relationship_type TEXT NOT NULL, -- temporal, spatial, semantic, causal
                confidence REAL NOT NULL,
                evidence TEXT, -- JSON with supporting evidence
                created_at REAL NOT NULL,
                FOREIGN KEY (primary_asset_id) REFERENCES media_assets (id),
                FOREIGN KEY (related_asset_id) REFERENCES media_assets (id)
            )
        """)
        
        # Fusion analysis results
        conn.execute("""
            CREATE TABLE IF NOT EXISTS fusion_analyses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                analysis_id TEXT UNIQUE NOT NULL,
                input_assets TEXT NOT NULL, -- JSON array of asset IDs
                analysis_type TEXT NOT NULL, -- narrative, correlation, anomaly, etc.
                fusion_result TEXT NOT NULL, -- JSON with synthesized insights
                confidence_score REAL NOT NULL,
                processing_time_ms REAL,
                created_at REAL NOT NULL
            )
        """)
        
        # Create indexes
        conn.execute("CREATE INDEX IF NOT EXISTS idx_assets_modality ON media_assets(modality)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_features_asset ON modality_features(asset_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_links_primary ON cross_modal_links(primary_asset_id)")
        
        conn.commit()
        conn.close()
    
    def load_processors(self):
        """Load available processing engines"""
        self.processors = {
            "text": {
                "keyword_extraction": self.extract_text_keywords,
                "sentiment_analysis": self.analyze_text_sentiment,
                "entity_recognition": self.extract_text_entities
            },
            "image": {
                "object_detection": self.detect_image_objects,
                "ocr_text": self.extract_image_text,
                "scene_analysis": self.analyze_image_scene
            },
            "audio": {
                "speech_to_text": self.transcribe_audio,
                "audio_analysis": self.analyze_audio_features
            },
            "structured": {
                "schema_analysis": self.analyze_data_schema,
                "pattern_detection": self.detect_data_patterns
            }
        }
    
    def ingest_media(self, filepath: Union[str, Path]) -> int:
        """Ingest media file and determine modality"""
        filepath = Path(filepath)
        if not filepath.exists():
            raise FileNotFoundError(f"File not found: {filepath}")
        
        # Calculate content hash
        content_hash = hashlib.sha256(filepath.read_bytes()).hexdigest()
        
        # Determine MIME type and modality
        mime_type, _ = mimetypes.guess_type(str(filepath))
        if not mime_type:
            mime_type = "application/octet-stream"
        
        modality = self.determine_modality(mime_type, filepath)
        
        # Store in database
        conn = sqlite3.connect(str(FUSION_DB))
        
        # Check if already processed
        cursor = conn.execute("SELECT id FROM media_assets WHERE content_hash = ?", (content_hash,))
        existing = cursor.fetchone()
        if existing:
            conn.close()
            return existing[0]
        
        cursor = conn.execute("""
            INSERT INTO media_assets (filepath, filename, content_hash, mime_type, 
                                    file_size, modality, created_at, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            str(filepath), filepath.name, content_hash, mime_type,
            filepath.stat().st_size, modality, time.time(), 
            json.dumps({"original_path": str(filepath)})
        ))
        
        asset_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        print(f"✅ Ingested {modality} asset: {filepath.name} (ID: {asset_id})")
        return asset_id
    
    def determine_modality(self, mime_type: str, filepath: Path) -> str:
        """Determine the modality of a file"""
        if mime_type.startswith("text/"):
            return "text"
        elif mime_type.startswith("image/"):
            return "image"
        elif mime_type.startswith("audio/"):
            return "audio"
        elif mime_type.startswith("video/"):
            return "video"
        elif filepath.suffix.lower() in [".json", ".csv", ".xml", ".yaml", ".yml"]:
            return "structured"
        else:
            # Fallback: try to read as text
            try:
                filepath.read_text(encoding='utf-8')
                return "text"
            except:
                return "binary"
    
    def process_asset(self, asset_id: int) -> Dict[str, Any]:
        """Process a media asset to extract features"""
        conn = sqlite3.connect(str(FUSION_DB))
        
        # Get asset info
        cursor = conn.execute("SELECT * FROM media_assets WHERE id = ?", (asset_id,))
        asset_row = cursor.fetchone()
        if not asset_row:
            raise ValueError(f"Asset {asset_id} not found")
        
        asset_info = {
            "id": asset_row[0],
            "filepath": asset_row[1],
            "filename": asset_row[2],
            "content_hash": asset_row[3],
            "mime_type": asset_row[4],
            "file_size": asset_row[5],
            "modality": asset_row[6],
            "created_at": asset_row[7],
            "metadata": json.loads(asset_row[8]) if asset_row[8] else {}
        }
        
        # Update status to processing
        conn.execute("UPDATE media_assets SET processing_status = 'processing' WHERE id = ?", (asset_id,))
        conn.commit()
        
        results = {"asset_id": asset_id, "features": {}}
        
        try:
            # Get processors for this modality
            modality_processors = self.processors.get(asset_info["modality"], {})
            
            for feature_type, processor_func in modality_processors.items():
                print(f"  Processing {feature_type} for {asset_info['filename']}...")
                
                try:
                    feature_data = processor_func(Path(asset_info["filepath"]), asset_info)
                    confidence = feature_data.get("confidence", 0.5)
                    
                    # Store feature
                    conn.execute("""
                        INSERT INTO modality_features 
                        (asset_id, feature_type, feature_data, confidence_score, 
                         extraction_method, extracted_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        asset_id, feature_type, json.dumps(feature_data),
                        confidence, processor_func.__name__, time.time()
                    ))
                    
                    results["features"][feature_type] = feature_data
                    
                except Exception as e:
                    print(f"    ❌ Failed to process {feature_type}: {e}")
                    results["features"][feature_type] = {"error": str(e)}
            
            # Update status to completed
            conn.execute("UPDATE media_assets SET processing_status = 'completed' WHERE id = ?", (asset_id,))
            
        except Exception as e:
            print(f"❌ Processing failed for asset {asset_id}: {e}")
            conn.execute("UPDATE media_assets SET processing_status = 'failed' WHERE id = ?", (asset_id,))
            results["error"] = str(e)
        
        conn.commit()
        conn.close()
        
        return results
    
    # Text Processing Functions
    def extract_text_keywords(self, filepath: Path, asset_info: Dict[str, Any]) -> Dict[str, Any]:
        """Extract keywords from text"""
        content = filepath.read_text(encoding='utf-8', errors='ignore')
        
        # Simple keyword extraction (can be enhanced)
        import re
        from collections import Counter
        
        # Clean and tokenize
        words = re.findall(r'\b[a-zA-Z]{3,}\b', content.lower())
        
        # Remove common stop words
        stop_words = {'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
        words = [w for w in words if w not in stop_words]
        
        # Get top keywords
        keyword_counts = Counter(words)
        top_keywords = keyword_counts.most_common(20)
        
        return {
            "keywords": [{"word": word, "frequency": count} for word, count in top_keywords],
            "word_count": len(words),
            "unique_words": len(set(words)),
            "confidence": 0.8
        }
    
    def analyze_text_sentiment(self, filepath: Path, asset_info: Dict[str, Any]) -> Dict[str, Any]:
        """Simple sentiment analysis"""
        content = filepath.read_text(encoding='utf-8', errors='ignore')
        
        # Simple word-based sentiment (can be enhanced with ML models)
        positive_words = {'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'perfect', 'love', 'like'}
        negative_words = {'bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'wrong', 'failed', 'error'}
        
        words = content.lower().split()
        positive_count = sum(1 for word in words if word in positive_words)
        negative_count = sum(1 for word in words if word in negative_words)
        
        total_sentiment_words = positive_count + negative_count
        if total_sentiment_words == 0:
            sentiment_score = 0.0  # Neutral
        else:
            sentiment_score = (positive_count - negative_count) / total_sentiment_words
        
        sentiment_label = "positive" if sentiment_score > 0.2 else "negative" if sentiment_score < -0.2 else "neutral"
        
        return {
            "sentiment_score": sentiment_score,
            "sentiment_label": sentiment_label,
            "positive_indicators": positive_count,
            "negative_indicators": negative_count,
            "confidence": min(0.9, total_sentiment_words / 10) if total_sentiment_words > 0 else 0.3
        }
    
    def extract_text_entities(self, filepath: Path, asset_info: Dict[str, Any]) -> Dict[str, Any]:
        """Extract named entities (simplified)"""
        content = filepath.read_text(encoding='utf-8', errors='ignore')
        
        # Simple regex-based entity extraction
        import re
        
        # Email patterns
        emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', content)
        
        # URL patterns
        urls = re.findall(r'https?://[^\s<>"]+', content)
        
        # Phone patterns (basic US format)
        phones = re.findall(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', content)
        
        # Dates (basic patterns)
        dates = re.findall(r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b', content)
        
        return {
            "entities": {
                "emails": list(set(emails)),
                "urls": list(set(urls)),
                "phones": list(set(phones)),
                "dates": list(set(dates))
            },
            "entity_count": len(emails) + len(urls) + len(phones) + len(dates),
            "confidence": 0.7
        }
    
    # Image Processing Functions
    def detect_image_objects(self, filepath: Path, asset_info: Dict[str, Any]) -> Dict[str, Any]:
        """Placeholder for object detection"""
        # This would integrate with computer vision models in production
        return {
            "objects": [
                {"label": "placeholder", "confidence": 0.5, "bbox": [0, 0, 100, 100]}
            ],
            "processing_method": "placeholder",
            "confidence": 0.3
        }
    
    def extract_image_text(self, filepath: Path, asset_info: Dict[str, Any]) -> Dict[str, Any]:
        """Extract text from images using OCR"""
        try:
            # Try to use tesseract if available
            result = subprocess.run([
                "tesseract", str(filepath), "-", "--oem", "1", "--psm", "3"
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                extracted_text = result.stdout.strip()
                return {
                    "extracted_text": extracted_text,
                    "text_length": len(extracted_text),
                    "processing_method": "tesseract",
                    "confidence": 0.8 if extracted_text else 0.1
                }
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        
        # Fallback: basic metadata
        return {
            "extracted_text": "",
            "text_length": 0,
            "processing_method": "unavailable",
            "confidence": 0.0,
            "note": "OCR engine not available"
        }
    
    def analyze_image_scene(self, filepath: Path, asset_info: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze image scene and context"""
        # Basic image analysis based on file properties
        try:
            from PIL import Image
            with Image.open(filepath) as img:
                width, height = img.size
                mode = img.mode
                
                # Basic analysis
                aspect_ratio = width / height
                is_portrait = height > width
                is_landscape = width > height
                is_square = abs(aspect_ratio - 1.0) < 0.1
                
                return {
                    "dimensions": {"width": width, "height": height},
                    "aspect_ratio": aspect_ratio,
                    "orientation": "portrait" if is_portrait else "landscape" if is_landscape else "square",
                    "color_mode": mode,
                    "estimated_complexity": "high" if width * height > 1000000 else "medium" if width * height > 100000 else "low",
                    "confidence": 0.9
                }
        except ImportError:
            pass
        
        # Fallback analysis
        file_size = filepath.stat().st_size
        return {
            "file_size_mb": file_size / (1024 * 1024),
            "estimated_complexity": "high" if file_size > 5 * 1024 * 1024 else "medium" if file_size > 1024 * 1024 else "low",
            "processing_method": "file_analysis",
            "confidence": 0.4
        }
    
    # Audio Processing Functions
    def transcribe_audio(self, filepath: Path, asset_info: Dict[str, Any]) -> Dict[str, Any]:
        """Transcribe audio to text"""
        # Placeholder for speech-to-text integration
        return {
            "transcript": "",
            "processing_method": "placeholder",
            "confidence": 0.0,
            "note": "Speech-to-text engine not configured"
        }
    
    def analyze_audio_features(self, filepath: Path, asset_info: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze audio characteristics"""
        file_size = filepath.stat().st_size
        
        # Basic audio analysis based on file properties
        return {
            "duration_estimate_seconds": file_size / 32000,  # Rough estimate
            "file_size_mb": file_size / (1024 * 1024),
            "estimated_quality": "high" if file_size > 10 * 1024 * 1024 else "medium" if file_size > 1024 * 1024 else "low",
            "processing_method": "file_analysis",
            "confidence": 0.3
        }
    
    # Structured Data Processing Functions
    def analyze_data_schema(self, filepath: Path, asset_info: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze structured data schema"""
        try:
            if filepath.suffix.lower() == '.json':
                with open(filepath, 'r') as f:
                    data = json.load(f)
                
                def analyze_json_structure(obj, path=""):
                    schema = {}
                    if isinstance(obj, dict):
                        for key, value in obj.items():
                            schema[key] = {
                                "type": type(value).__name__,
                                "path": f"{path}.{key}" if path else key
                            }
                            if isinstance(value, (dict, list)):
                                schema[key]["nested"] = analyze_json_structure(value, f"{path}.{key}" if path else key)
                    elif isinstance(obj, list) and obj:
                        schema["array_element_type"] = type(obj[0]).__name__
                        if isinstance(obj[0], (dict, list)):
                            schema["array_element_schema"] = analyze_json_structure(obj[0], f"{path}[0]")
                    
                    return schema
                
                schema = analyze_json_structure(data)
                
                return {
                    "schema": schema,
                    "data_type": "json",
                    "top_level_keys": list(data.keys()) if isinstance(data, dict) else [],
                    "estimated_records": len(data) if isinstance(data, list) else 1,
                    "confidence": 0.9
                }
                
        except Exception as e:
            return {
                "schema": {},
                "data_type": "unknown",
                "error": str(e),
                "confidence": 0.1
            }
    
    def detect_data_patterns(self, filepath: Path, asset_info: Dict[str, Any]) -> Dict[str, Any]:
        """Detect patterns in structured data"""
        try:
            if filepath.suffix.lower() == '.csv':
                # Simple CSV analysis
                with open(filepath, 'r') as f:
                    first_line = f.readline().strip()
                    headers = first_line.split(',')
                    
                    # Count lines
                    line_count = sum(1 for _ in f) + 1
                
                return {
                    "patterns": {
                        "column_count": len(headers),
                        "estimated_rows": line_count,
                        "headers": headers[:10]  # First 10 headers
                    },
                    "data_format": "csv",
                    "confidence": 0.8
                }
                
        except Exception as e:
            return {
                "patterns": {},
                "error": str(e),
                "confidence": 0.1
            }
    
    def cross_modal_analysis(self, asset_ids: List[int]) -> Dict[str, Any]:
        """Analyze relationships across multiple modalities"""
        conn = sqlite3.connect(str(FUSION_DB))
        
        # Get assets and their features
        assets_data = {}
        for asset_id in asset_ids:
            # Get asset info
            cursor = conn.execute("SELECT * FROM media_assets WHERE id = ?", (asset_id,))
            asset_row = cursor.fetchone()
            if not asset_row:
                continue
            
            # Get features
            cursor = conn.execute("SELECT feature_type, feature_data FROM modality_features WHERE asset_id = ?", (asset_id,))
            features = {row[0]: json.loads(row[1]) for row in cursor.fetchall()}
            
            assets_data[asset_id] = {
                "modality": asset_row[6],
                "filename": asset_row[2],
                "features": features
            }
        
        # Cross-modal correlation analysis
        correlations = []
        
        # Text-Image correlations
        text_assets = [id for id, data in assets_data.items() if data["modality"] == "text"]
        image_assets = [id for id, data in assets_data.items() if data["modality"] == "image"]
        
        for text_id in text_assets:
            text_features = assets_data[text_id]["features"]
            for image_id in image_assets:
                image_features = assets_data[image_id]["features"]
                
                # Check for text extraction correlation
                if "keyword_extraction" in text_features and "ocr_text" in image_features:
                    text_keywords = set(kw["word"] for kw in text_features["keyword_extraction"]["keywords"][:10])
                    image_text = image_features["ocr_text"]["extracted_text"].lower()
                    
                    # Simple keyword overlap
                    overlap = sum(1 for word in text_keywords if word in image_text)
                    if overlap > 0:
                        correlations.append({
                            "primary_asset": text_id,
                            "related_asset": image_id,
                            "relationship": "textual_overlap",
                            "confidence": min(0.9, overlap / len(text_keywords)),
                            "evidence": {"overlapping_terms": overlap}
                        })
        
        # Temporal correlations (based on creation time)
        creation_times = [(id, data) for id, data in assets_data.items()]
        creation_times.sort(key=lambda x: x[1].get("created_at", 0))
        
        for i in range(len(creation_times) - 1):
            current_id, current_data = creation_times[i]
            next_id, next_data = creation_times[i + 1]
            
            # If assets were created close in time, suggest temporal relationship
            time_diff = abs(current_data.get("created_at", 0) - next_data.get("created_at", 0))
            if time_diff < 300:  # Within 5 minutes
                correlations.append({
                    "primary_asset": current_id,
                    "related_asset": next_id,
                    "relationship": "temporal_proximity",
                    "confidence": max(0.3, 1.0 - (time_diff / 300)),
                    "evidence": {"time_difference_seconds": time_diff}
                })
        
        # Store correlations
        for correlation in correlations:
            conn.execute("""
                INSERT INTO cross_modal_links 
                (primary_asset_id, related_asset_id, relationship_type, confidence, evidence, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                correlation["primary_asset"],
                correlation["related_asset"],
                correlation["relationship"],
                correlation["confidence"],
                json.dumps(correlation["evidence"]),
                time.time()
            ))
        
        conn.commit()
        conn.close()
        
        return {
            "assets_analyzed": len(assets_data),
            "correlations_found": len(correlations),
            "correlations": correlations
        }
    
    def generate_fusion_narrative(self, asset_ids: List[int]) -> Dict[str, Any]:
        """Generate a narrative combining insights from multiple modalities"""
        start_time = time.time()
        
        # Perform cross-modal analysis first
        correlation_analysis = self.cross_modal_analysis(asset_ids)
        
        # Generate narrative using ask_with_pack
        context_parts = []
        
        conn = sqlite3.connect(str(FUSION_DB))
        for asset_id in asset_ids:
            # Get asset features
            cursor = conn.execute("""
                SELECT ma.filename, ma.modality, mf.feature_type, mf.feature_data
                FROM media_assets ma
                JOIN modality_features mf ON ma.id = mf.asset_id
                WHERE ma.id = ?
            """, (asset_id,))
            
            asset_features = {}
            filename = ""
            modality = ""
            
            for row in cursor.fetchall():
                filename, modality, feature_type, feature_data = row
                asset_features[feature_type] = json.loads(feature_data)
            
            if filename:
                context_parts.append(f"[{modality.upper()}: {filename}]")
                
                # Summarize key features
                if modality == "text" and "keyword_extraction" in asset_features:
                    keywords = [kw["word"] for kw in asset_features["keyword_extraction"]["keywords"][:5]]
                    context_parts.append(f"Key topics: {', '.join(keywords)}")
                
                if "sentiment_analysis" in asset_features:
                    sentiment = asset_features["sentiment_analysis"]
                    context_parts.append(f"Sentiment: {sentiment['sentiment_label']} ({sentiment['sentiment_score']:.2f})")
        
        conn.close()
        
        # Add correlation information
        if correlation_analysis["correlations"]:
            context_parts.append(f"\nCross-modal relationships found: {len(correlation_analysis['correlations'])}")
            for corr in correlation_analysis["correlations"][:3]:  # Top 3
                context_parts.append(f"- {corr['relationship']} (confidence: {corr['confidence']:.2f})")
        
        context_text = "\n".join(context_parts)
        
        # Generate narrative
        try:
            cmd = [
                "python3", str(ROOT / "tools" / "ask_with_pack.py"),
                "research", 
                "Analyze and synthesize insights from this multi-modal content"
            ]
            
            env = os.environ.copy()
            env["CONTEXT"] = context_text
            
            result = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=60)
            
            if result.returncode == 0:
                narrative = result.stdout.strip()
            else:
                narrative = f"Analysis generation failed: {result.stderr}"
                
        except Exception as e:
            narrative = f"Failed to generate narrative: {str(e)}"
        
        processing_time = (time.time() - start_time) * 1000
        
        # Store fusion analysis
        analysis_id = hashlib.md5(f"{asset_ids}{time.time()}".encode()).hexdigest()[:12]
        fusion_result = {
            "narrative": narrative,
            "asset_count": len(asset_ids),
            "correlation_analysis": correlation_analysis,
            "context_data": context_text
        }
        
        conn = sqlite3.connect(str(FUSION_DB))
        conn.execute("""
            INSERT INTO fusion_analyses 
            (analysis_id, input_assets, analysis_type, fusion_result, confidence_score, processing_time_ms, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            analysis_id, json.dumps(asset_ids), "narrative_synthesis",
            json.dumps(fusion_result), 0.7, processing_time, time.time()
        ))
        conn.commit()
        conn.close()
        
        return {
            "analysis_id": analysis_id,
            "narrative": narrative,
            "fusion_result": fusion_result,
            "processing_time_ms": processing_time
        }

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Multi-Modal Intelligence Fusion")
    parser.add_argument("--ingest", help="Ingest media file or directory")
    parser.add_argument("--process", type=int, help="Process asset by ID")
    parser.add_argument("--analyze", nargs="+", type=int, help="Cross-modal analysis of asset IDs")
    parser.add_argument("--narrative", nargs="+", type=int, help="Generate fusion narrative for asset IDs")
    parser.add_argument("--stats", action="store_true", help="Show fusion statistics")
    
    args = parser.parse_args()
    
    processor = MultiModalProcessor()
    
    if args.ingest:
        ingest_path = Path(args.ingest)
        
        if ingest_path.is_file():
            asset_id = processor.ingest_media(ingest_path)
            print(f"🔄 Processing asset {asset_id}...")
            results = processor.process_asset(asset_id)
            print(f"✅ Extracted {len(results['features'])} feature types")
            
        elif ingest_path.is_dir():
            print(f"📚 Ingesting directory: {ingest_path}")
            asset_ids = []
            
            for file_path in ingest_path.rglob("*"):
                if file_path.is_file() and not file_path.name.startswith('.'):
                    try:
                        asset_id = processor.ingest_media(file_path)
                        asset_ids.append(asset_id)
                        processor.process_asset(asset_id)
                    except Exception as e:
                        print(f"❌ Failed to process {file_path}: {e}")
            
            print(f"🎉 Processed {len(asset_ids)} assets")
    
    elif args.process:
        print(f"🔄 Processing asset {args.process}...")
        results = processor.process_asset(args.process)
        print(f"✅ Extracted features: {list(results['features'].keys())}")
    
    elif args.analyze:
        print(f"🔍 Cross-modal analysis of assets: {args.analyze}")
        results = processor.cross_modal_analysis(args.analyze)
        print(f"📊 Found {results['correlations_found']} correlations")
        
        for correlation in results["correlations"]:
            print(f"  {correlation['relationship']}: {correlation['primary_asset']} ↔ {correlation['related_asset']} (confidence: {correlation['confidence']:.2f})")
    
    elif args.narrative:
        print(f"📝 Generating fusion narrative for assets: {args.narrative}")
        results = processor.generate_fusion_narrative(args.narrative)
        
        print(f"\n📖 Multi-Modal Intelligence Fusion Narrative:")
        print("=" * 60)
        print(results["narrative"])
        print("=" * 60)
        print(f"Analysis ID: {results['analysis_id']}")
        print(f"Processing time: {results['processing_time_ms']:.0f}ms")
    
    elif args.stats:
        conn = sqlite3.connect(str(FUSION_DB))
        
        # Asset stats by modality
        cursor = conn.execute("SELECT modality, COUNT(*) FROM media_assets GROUP BY modality")
        modality_counts = dict(cursor.fetchall())
        
        # Feature extraction stats
        cursor = conn.execute("SELECT COUNT(*) FROM modality_features")
        feature_count = cursor.fetchone()[0]
        
        # Cross-modal link stats
        cursor = conn.execute("SELECT COUNT(*) FROM cross_modal_links")
        link_count = cursor.fetchone()[0]
        
        # Fusion analysis stats
        cursor = conn.execute("SELECT COUNT(*) FROM fusion_analyses")
        analysis_count = cursor.fetchone()[0]
        
        conn.close()
        
        print("📊 Multi-Modal Fusion Statistics:")
        print(f"  Assets by modality:")
        for modality, count in modality_counts.items():
            print(f"    {modality}: {count}")
        print(f"  🔍 Features extracted: {feature_count}")
        print(f"  🔗 Cross-modal links: {link_count}")
        print(f"  📖 Fusion analyses: {analysis_count}")
    
    else:
        print("Usage: multimodal_fusion.py --ingest <path> | --process <id> | --analyze <id1> <id2> ... | --narrative <id1> <id2> ... | --stats")

if __name__ == "__main__":
    main()