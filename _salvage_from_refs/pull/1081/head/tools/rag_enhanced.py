#!/usr/bin/env python3
"""
Enhanced RAG with Vector Clustering and Semantic Intelligence
Advanced retrieval-augmented generation with clustering, re-ranking, and multi-modal support
"""
import json, os, sys, sqlite3, time, math, hashlib
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import numpy as np
from collections import defaultdict, Counter
import re

ROOT = Path(__file__).resolve().parent.parent
RAG_DB = ROOT / "rag" / "index" / "rag_enhanced.db"
CORPUS_DIR = ROOT / "rag" / "corpus"

class EnhancedRAG:
    def __init__(self):
        self.ensure_dirs()
        self.init_enhanced_db()
        self.load_stop_words()
    
    def ensure_dirs(self):
        """Ensure RAG directories exist"""
        for path in [RAG_DB.parent, CORPUS_DIR]:
            path.mkdir(parents=True, exist_ok=True)
    
    def init_enhanced_db(self):
        """Initialize enhanced RAG database with clustering capabilities"""
        conn = sqlite3.connect(str(RAG_DB))
        
        # Core documents table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                content TEXT NOT NULL,
                content_hash TEXT UNIQUE NOT NULL,
                word_count INTEGER,
                char_count INTEGER,
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL,
                doc_type TEXT DEFAULT 'text',
                metadata TEXT DEFAULT '{}',
                semantic_fingerprint TEXT
            )
        """)
        
        # Chunks table with enhanced metadata
        conn.execute("""
            CREATE TABLE IF NOT EXISTS chunks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER NOT NULL,
                chunk_index INTEGER NOT NULL,
                content TEXT NOT NULL,
                content_hash TEXT UNIQUE NOT NULL,
                word_count INTEGER,
                char_count INTEGER,
                embedding_vector BLOB,
                cluster_id INTEGER,
                importance_score REAL DEFAULT 0.5,
                semantic_tags TEXT DEFAULT '[]',
                FOREIGN KEY (document_id) REFERENCES documents (id)
            )
        """)
        
        # Semantic clusters
        conn.execute("""
            CREATE TABLE IF NOT EXISTS clusters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cluster_name TEXT,
                centroid_vector BLOB,
                size INTEGER DEFAULT 0,
                coherence_score REAL,
                dominant_topics TEXT DEFAULT '[]',
                created_at REAL NOT NULL
            )
        """)
        
        # Query history with performance tracking
        conn.execute("""
            CREATE TABLE IF NOT EXISTS query_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query_text TEXT NOT NULL,
                query_hash TEXT NOT NULL,
                query_embedding BLOB,
                retrieved_chunks TEXT, -- JSON array of chunk IDs
                relevance_scores TEXT, -- JSON array of scores
                response_quality REAL,
                user_feedback INTEGER, -- -1, 0, 1 for bad, neutral, good
                processing_time_ms REAL,
                timestamp REAL NOT NULL
            )
        """)
        
        # Create indexes for performance
        conn.execute("CREATE INDEX IF NOT EXISTS idx_documents_hash ON documents(content_hash)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks(document_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_chunks_cluster ON chunks(cluster_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_query_hash ON query_history(query_hash)")
        
        conn.commit()
        conn.close()
    
    def load_stop_words(self):
        """Load stop words for text processing"""
        self.stop_words = {
            'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
            'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
            'to', 'was', 'were', 'will', 'with', 'have', 'this', 'but', 'they',
            'you', 'all', 'can', 'her', 'any', 'may', 'had', 'our', 'out',
            'day', 'get', 'use', 'man', 'new', 'now', 'way', 'she', 'say'
        }
    
    def extract_keywords(self, text: str, top_k: int = 10) -> List[str]:
        """Extract keywords using simple TF-IDF-like scoring"""
        # Tokenize and clean
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        words = [w for w in words if w not in self.stop_words]
        
        # Count frequencies
        word_counts = Counter(words)
        
        # Simple TF scoring (could be enhanced with IDF)
        total_words = len(words)
        scored_words = [
            (word, count / total_words) 
            for word, count in word_counts.items()
        ]
        
        # Return top keywords
        return [word for word, score in sorted(scored_words, key=lambda x: x[1], reverse=True)[:top_k]]
    
    def create_simple_embedding(self, text: str) -> np.ndarray:
        """Create simple hash-based embedding (placeholder for real embeddings)"""
        # This is a simplified embedding - in production, use proper models
        words = self.extract_keywords(text, 20)
        
        # Create a 128-dimensional vector based on word hashes
        embedding = np.zeros(128)
        for word in words:
            word_hash = int(hashlib.md5(word.encode()).hexdigest(), 16)
            for i in range(128):
                embedding[i] += (word_hash >> i) & 1
        
        # Normalize
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
            
        return embedding
    
    def cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Calculate cosine similarity between vectors"""
        dot_product = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        
        if norm_a == 0 or norm_b == 0:
            return 0.0
            
        return dot_product / (norm_a * norm_b)
    
    def chunk_document(self, content: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """Smart document chunking with overlap"""
        sentences = re.split(r'[.!?]+', content)
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
                
            # If adding this sentence would exceed chunk size, finalize current chunk
            if len(current_chunk) + len(sentence) > chunk_size and current_chunk:
                chunks.append(current_chunk.strip())
                
                # Create overlap
                words = current_chunk.split()
                if len(words) > overlap // 5:  # Rough word overlap
                    overlap_words = words[-(overlap // 5):]
                    current_chunk = " ".join(overlap_words) + " " + sentence
                else:
                    current_chunk = sentence
            else:
                current_chunk += " " + sentence if current_chunk else sentence
        
        # Add final chunk
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
            
        return [chunk for chunk in chunks if len(chunk.strip()) > 50]  # Filter too-short chunks
    
    def ingest_document(self, filepath: Path, doc_type: str = "text") -> int:
        """Ingest a document with enhanced processing"""
        try:
            content = filepath.read_text(encoding='utf-8', errors='ignore')
        except Exception as e:
            print(f"Error reading {filepath}: {e}")
            return 0
        
        content_hash = hashlib.sha256(content.encode()).hexdigest()
        
        conn = sqlite3.connect(str(RAG_DB))
        
        # Check if document already exists
        cursor = conn.execute("SELECT id FROM documents WHERE content_hash = ?", (content_hash,))
        if cursor.fetchone():
            conn.close()
            return 0  # Already processed
        
        # Extract metadata
        keywords = self.extract_keywords(content)
        semantic_fingerprint = json.dumps(keywords)
        
        # Insert document
        cursor = conn.execute("""
            INSERT INTO documents (filename, content, content_hash, word_count, char_count, 
                                 created_at, updated_at, doc_type, semantic_fingerprint)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            filepath.name, content, content_hash, len(content.split()), len(content),
            time.time(), time.time(), doc_type, semantic_fingerprint
        ))
        
        document_id = cursor.lastrowid
        
        # Chunk document
        chunks = self.chunk_document(content)
        chunk_count = 0
        
        for i, chunk_content in enumerate(chunks):
            chunk_hash = hashlib.sha256(chunk_content.encode()).hexdigest()
            
            # Create embedding
            embedding = self.create_simple_embedding(chunk_content)
            embedding_blob = embedding.tobytes()
            
            # Extract chunk keywords for semantic tagging
            chunk_keywords = self.extract_keywords(chunk_content, 5)
            
            # Calculate importance score based on keyword density and position
            importance = 0.5  # Base score
            if i == 0:  # First chunk often more important
                importance += 0.2
            if len(chunk_keywords) > 3:  # Keyword-rich chunks
                importance += 0.1
                
            # Insert chunk
            conn.execute("""
                INSERT INTO chunks (document_id, chunk_index, content, content_hash,
                                  word_count, char_count, embedding_vector, importance_score,
                                  semantic_tags)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                document_id, i, chunk_content, chunk_hash,
                len(chunk_content.split()), len(chunk_content),
                embedding_blob, importance, json.dumps(chunk_keywords)
            ))
            
            chunk_count += 1
        
        conn.commit()
        conn.close()
        
        print(f"✅ Ingested {filepath.name}: {chunk_count} chunks")
        return chunk_count
    
    def build_clusters(self, max_clusters: int = 10) -> int:
        """Build semantic clusters from chunk embeddings"""
        conn = sqlite3.connect(str(RAG_DB))
        
        # Get all chunks with embeddings
        cursor = conn.execute("""
            SELECT id, embedding_vector, semantic_tags, importance_score 
            FROM chunks 
            WHERE embedding_vector IS NOT NULL
        """)
        
        chunks_data = []
        for row in cursor.fetchall():
            chunk_id, embedding_blob, semantic_tags, importance = row
            embedding = np.frombuffer(embedding_blob, dtype=np.float64)
            tags = json.loads(semantic_tags) if semantic_tags else []
            chunks_data.append((chunk_id, embedding, tags, importance))
        
        if len(chunks_data) < 2:
            conn.close()
            return 0
        
        # Simple k-means clustering (simplified implementation)
        embeddings = np.array([chunk[1] for chunk in chunks_data])
        
        # Determine optimal cluster count
        n_chunks = len(chunks_data)
        k = min(max_clusters, max(2, int(math.sqrt(n_chunks))))
        
        # Initialize centroids randomly
        centroids = embeddings[np.random.choice(n_chunks, k, replace=False)]
        
        # Simple k-means iterations
        for iteration in range(10):  # Limited iterations
            # Assign chunks to closest centroid
            distances = np.array([[self.cosine_similarity(emb, centroid) 
                                 for centroid in centroids] 
                                for emb in embeddings])
            cluster_assignments = np.argmax(distances, axis=1)
            
            # Update centroids
            new_centroids = []
            for cluster_idx in range(k):
                cluster_embeddings = embeddings[cluster_assignments == cluster_idx]
                if len(cluster_embeddings) > 0:
                    new_centroid = np.mean(cluster_embeddings, axis=0)
                    # Normalize
                    norm = np.linalg.norm(new_centroid)
                    if norm > 0:
                        new_centroid = new_centroid / norm
                    new_centroids.append(new_centroid)
                else:
                    # Keep old centroid if no chunks assigned
                    new_centroids.append(centroids[cluster_idx])
            
            centroids = np.array(new_centroids)
        
        # Clear existing clusters
        conn.execute("DELETE FROM clusters")
        
        # Create new clusters
        cluster_id_map = {}
        for cluster_idx in range(k):
            cluster_chunks = [chunks_data[i] for i in range(len(chunks_data)) 
                            if cluster_assignments[i] == cluster_idx]
            
            if not cluster_chunks:
                continue
                
            # Extract dominant topics
            all_tags = []
            for chunk_id, emb, tags, importance in cluster_chunks:
                all_tags.extend(tags)
            
            dominant_topics = [tag for tag, count in Counter(all_tags).most_common(5)]
            cluster_name = f"cluster_{len(dominant_topics)}_{dominant_topics[0] if dominant_topics else 'misc'}"
            
            # Calculate coherence (average pairwise similarity)
            coherence = 0.0
            if len(cluster_chunks) > 1:
                similarities = []
                for i in range(len(cluster_chunks)):
                    for j in range(i + 1, len(cluster_chunks)):
                        sim = self.cosine_similarity(cluster_chunks[i][1], cluster_chunks[j][1])
                        similarities.append(sim)
                coherence = sum(similarities) / len(similarities) if similarities else 0.0
            
            # Insert cluster
            cursor = conn.execute("""
                INSERT INTO clusters (cluster_name, centroid_vector, size, coherence_score,
                                    dominant_topics, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                cluster_name, centroids[cluster_idx].tobytes(), len(cluster_chunks),
                coherence, json.dumps(dominant_topics), time.time()
            ))
            
            cluster_db_id = cursor.lastrowid
            cluster_id_map[cluster_idx] = cluster_db_id
        
        # Update chunk cluster assignments
        for i, (chunk_id, emb, tags, importance) in enumerate(chunks_data):
            cluster_idx = cluster_assignments[i]
            if cluster_idx in cluster_id_map:
                conn.execute("UPDATE chunks SET cluster_id = ? WHERE id = ?",
                           (cluster_id_map[cluster_idx], chunk_id))
        
        conn.commit()
        conn.close()
        
        print(f"🔮 Built {len(cluster_id_map)} semantic clusters")
        return len(cluster_id_map)
    
    def enhanced_search(self, query: str, top_k: int = 5, use_clustering: bool = True) -> List[Dict[str, Any]]:
        """Enhanced semantic search with clustering and re-ranking"""
        start_time = time.time()
        query_hash = hashlib.md5(query.encode()).hexdigest()
        
        # Create query embedding
        query_embedding = self.create_simple_embedding(query)
        query_keywords = self.extract_keywords(query)
        
        conn = sqlite3.connect(str(RAG_DB))
        
        # Get all chunks with embeddings
        cursor = conn.execute("""
            SELECT c.id, c.content, c.embedding_vector, c.importance_score, c.semantic_tags,
                   c.cluster_id, d.filename, cl.coherence_score
            FROM chunks c
            JOIN documents d ON c.document_id = d.id
            LEFT JOIN clusters cl ON c.cluster_id = cl.id
            WHERE c.embedding_vector IS NOT NULL
        """)
        
        candidates = []
        for row in cursor.fetchall():
            chunk_id, content, embedding_blob, importance, semantic_tags, cluster_id, filename, coherence = row
            chunk_embedding = np.frombuffer(embedding_blob, dtype=np.float64)
            
            # Calculate base similarity
            similarity = self.cosine_similarity(query_embedding, chunk_embedding)
            
            # Enhance score with various factors
            enhanced_score = similarity
            
            # Importance boost
            enhanced_score += importance * 0.1
            
            # Keyword matching boost
            chunk_keywords = json.loads(semantic_tags) if semantic_tags else []
            keyword_overlap = len(set(query_keywords) & set(chunk_keywords))
            if keyword_overlap > 0:
                enhanced_score += keyword_overlap * 0.05
            
            # Cluster coherence boost (rewards well-clustered content)
            if coherence and coherence > 0.5:
                enhanced_score += coherence * 0.1
            
            candidates.append({
                'chunk_id': chunk_id,
                'content': content,
                'similarity': similarity,
                'enhanced_score': enhanced_score,
                'importance': importance,
                'semantic_tags': chunk_keywords,
                'cluster_id': cluster_id,
                'filename': filename,
                'keyword_overlap': keyword_overlap
            })
        
        # Sort by enhanced score
        candidates.sort(key=lambda x: x['enhanced_score'], reverse=True)
        
        # Apply clustering diversity if enabled
        if use_clustering and len(candidates) > top_k:
            # Ensure diversity across clusters
            selected = []
            used_clusters = set()
            
            # First pass: select best from each cluster
            for candidate in candidates:
                if candidate['cluster_id'] and candidate['cluster_id'] not in used_clusters:
                    selected.append(candidate)
                    used_clusters.add(candidate['cluster_id'])
                    if len(selected) >= top_k:
                        break
            
            # Second pass: fill remaining slots with highest scores
            for candidate in candidates:
                if candidate not in selected:
                    selected.append(candidate)
                    if len(selected) >= top_k:
                        break
            
            results = selected[:top_k]
        else:
            results = candidates[:top_k]
        
        # Log query for learning
        processing_time = (time.time() - start_time) * 1000
        retrieved_chunks = [r['chunk_id'] for r in results]
        relevance_scores = [r['enhanced_score'] for r in results]
        
        conn.execute("""
            INSERT INTO query_history (query_text, query_hash, query_embedding,
                                     retrieved_chunks, relevance_scores, processing_time_ms, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            query, query_hash, query_embedding.tobytes(),
            json.dumps(retrieved_chunks), json.dumps(relevance_scores),
            processing_time, time.time()
        ))
        
        conn.commit()
        conn.close()
        
        return results
    
    def generate_rag_response(self, query: str, context_chunks: List[Dict[str, Any]]) -> str:
        """Generate response using retrieved context"""
        # Prepare context
        context_text = "\n\n".join([
            f"[{i+1}] {chunk['content'][:500]}..."
            if len(chunk['content']) > 500
            else f"[{i+1}] {chunk['content']}"
            for i, chunk in enumerate(context_chunks)
        ])
        
        # Use ask_with_pack for response generation
        try:
            import subprocess
            cmd = [
                "python3", str(ROOT / "tools" / "ask_with_pack.py"),
                "research", query
            ]
            
            env = os.environ.copy()
            env["CONTEXT"] = context_text
            
            result = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                return result.stdout.strip()
            else:
                return f"Error generating response: {result.stderr}"
                
        except Exception as e:
            return f"Failed to generate response: {str(e)}"

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Enhanced RAG with Vector Clustering")
    parser.add_argument("--ingest", help="Ingest documents from directory")
    parser.add_argument("--cluster", action="store_true", help="Build semantic clusters")
    parser.add_argument("--query", help="Search query")
    parser.add_argument("--top-k", type=int, default=5, help="Number of results to return")
    parser.add_argument("--stats", action="store_true", help="Show RAG statistics")
    
    args = parser.parse_args()
    
    rag = EnhancedRAG()
    
    if args.ingest:
        ingest_path = Path(args.ingest)
        total_chunks = 0
        
        if ingest_path.is_dir():
            print(f"📚 Ingesting documents from {ingest_path}...")
            for file_path in ingest_path.glob("**/*.txt"):
                chunks = rag.ingest_document(file_path)
                total_chunks += chunks
                
        elif ingest_path.is_file():
            chunks = rag.ingest_document(ingest_path)
            total_chunks += chunks
        
        print(f"🎉 Ingestion complete: {total_chunks} total chunks")
        
        if total_chunks > 0:
            print("🔮 Building semantic clusters...")
            cluster_count = rag.build_clusters()
            print(f"✅ Created {cluster_count} clusters")
    
    elif args.cluster:
        print("🔮 Building semantic clusters...")
        cluster_count = rag.build_clusters()
        print(f"✅ Created {cluster_count} clusters")
    
    elif args.query:
        print(f"🔍 Searching: {args.query}")
        results = rag.enhanced_search(args.query, top_k=args.top_k)
        
        if results:
            print(f"\n📋 Top {len(results)} results:")
            for i, result in enumerate(results, 1):
                print(f"\n{i}. [{result['filename']}] (score: {result['enhanced_score']:.3f})")
                print(f"   Keywords: {', '.join(result['semantic_tags'][:3])}")
                print(f"   {result['content'][:200]}...")
            
            # Generate RAG response
            print(f"\n🤖 Generated Response:")
            print("-" * 50)
            response = rag.generate_rag_response(args.query, results)
            print(response)
            
        else:
            print("❌ No results found")
    
    elif args.stats:
        conn = sqlite3.connect(str(RAG_DB))
        
        # Document stats
        cursor = conn.execute("SELECT COUNT(*), SUM(word_count) FROM documents")
        doc_count, total_words = cursor.fetchone()
        
        # Chunk stats
        cursor = conn.execute("SELECT COUNT(*), AVG(word_count) FROM chunks")
        chunk_count, avg_chunk_words = cursor.fetchone()
        
        # Cluster stats
        cursor = conn.execute("SELECT COUNT(*), AVG(size), AVG(coherence_score) FROM clusters")
        cluster_count, avg_cluster_size, avg_coherence = cursor.fetchone()
        
        # Query stats
        cursor = conn.execute("SELECT COUNT(*), AVG(processing_time_ms) FROM query_history")
        query_count, avg_query_time = cursor.fetchone()
        
        conn.close()
        
        print("📊 Enhanced RAG Statistics:")
        print(f"  📚 Documents: {doc_count or 0} ({total_words or 0:,} total words)")
        print(f"  🧩 Chunks: {chunk_count or 0} (avg {avg_chunk_words or 0:.0f} words/chunk)")
        print(f"  🔮 Clusters: {cluster_count or 0} (avg size: {avg_cluster_size or 0:.1f}, coherence: {avg_coherence or 0:.2f})")
        print(f"  🔍 Queries: {query_count or 0} (avg {avg_query_time or 0:.1f}ms)")
    
    else:
        print("Usage: rag_enhanced.py --ingest <path> | --query <text> | --cluster | --stats")

if __name__ == "__main__":
    main()