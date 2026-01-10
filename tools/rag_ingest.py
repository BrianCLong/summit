#!/usr/bin/env python3
"""
Enhanced RAG Ingestion Tool with DuckDB optimizations
Supports multiple file types, configurable chunking, and robust error handling.
"""

import argparse
import hashlib
import http.client
import json
import os
import pathlib
import time
from dataclasses import dataclass

import duckdb


@dataclass
class ChunkMetadata:
    """Metadata for a document chunk."""

    file_path: str
    chunk_index: int
    chunk_size: int
    file_hash: str
    created_at: int


class RAGIngestor:
    """Enhanced RAG document ingestor with DuckDB backend."""

    def __init__(
        self,
        db_path: str = "rag/index/rag.duckdb",
        ollama_host: str = "127.0.0.1",
        ollama_port: int = 11434,
        embed_model: str = "nomic-embed-text",
        embed_dim: int = 768,
    ):
        self.db_path = db_path
        self.ollama_host = ollama_host
        self.ollama_port = ollama_port
        self.embed_model = embed_model
        self.embed_dim = embed_dim

        # Ensure directory exists
        os.makedirs(os.path.dirname(db_path), exist_ok=True)

        # Initialize database
        self._init_database()

    def _init_database(self):
        """Initialize DuckDB with optimized schema."""
        self.con = duckdb.connect(self.db_path)

        # Create enhanced schema with metadata
        self.con.execute(
            """
            CREATE TABLE IF NOT EXISTS docs (
                id INTEGER PRIMARY KEY,
                path TEXT NOT NULL,
                chunk TEXT NOT NULL,
                emb FLOAT[768] NOT NULL,
                chunk_index INTEGER DEFAULT 0,
                file_hash TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Create indexes for better query performance
        try:
            self.con.execute("CREATE INDEX IF NOT EXISTS idx_docs_path ON docs(path)")
            self.con.execute("CREATE INDEX IF NOT EXISTS idx_docs_hash ON docs(file_hash)")
        except Exception:
            pass  # Indexes may already exist

    def _get_file_hash(self, file_path: str) -> str:
        """Get SHA-256 hash of file contents."""
        hasher = hashlib.sha256()
        try:
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hasher.update(chunk)
            return hasher.hexdigest()
        except Exception:
            return ""

    def _embed_text(self, text: str, retries: int = 3) -> list[float] | None:
        """Generate embedding for text with retry logic."""
        for attempt in range(retries):
            try:
                conn = http.client.HTTPConnection(self.ollama_host, self.ollama_port, timeout=60)

                payload = {"model": self.embed_model, "prompt": text}

                body = json.dumps(payload).encode("utf-8")
                headers = {"Content-Type": "application/json"}

                conn.request("POST", "/api/embeddings", body, headers)
                response = conn.getresponse()

                if response.status != 200:
                    print(f"Warning: Embedding API returned status {response.status}")
                    continue

                data = json.loads(response.read().decode("utf-8"))
                embedding = data.get("embedding", [])

                if isinstance(embedding, list) and len(embedding) == self.embed_dim:
                    return embedding
                else:
                    print(
                        f"Warning: Invalid embedding dimension: expected {self.embed_dim}, got {len(embedding)}"
                    )

            except Exception as e:
                print(f"Embedding attempt {attempt + 1} failed: {e}")
                if attempt < retries - 1:
                    time.sleep(0.5 * (attempt + 1))  # Exponential backoff
            finally:
                try:
                    conn.close()
                except:
                    pass

        return None

    def _chunk_text(self, text: str, chunk_size: int = 800, overlap: int = 100) -> list[str]:
        """Split text into overlapping chunks."""
        if len(text) <= chunk_size:
            return [text]

        chunks = []
        start = 0

        while start < len(text):
            end = start + chunk_size

            # Try to break at word boundaries
            if end < len(text):
                # Look for sentence endings first
                for i in range(end, max(start + chunk_size // 2, end - 200), -1):
                    if text[i : i + 2] in [". ", "! ", "? ", "\n\n"]:
                        end = i + 1
                        break
                else:
                    # Fall back to word boundaries
                    for i in range(end, max(start + chunk_size // 2, end - 100), -1):
                        if text[i] in [" ", "\n", "\t"]:
                            end = i
                            break

            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)

            start = max(start + chunk_size - overlap, end)

        return chunks

    def _read_file(self, file_path: str) -> str | None:
        """Read file contents with encoding detection."""
        encodings = ["utf-8", "utf-8-sig", "latin-1", "cp1252"]

        for encoding in encodings:
            try:
                with open(file_path, encoding=encoding, errors="ignore") as f:
                    return f.read()
            except Exception:
                continue

        print(f"Warning: Could not read {file_path} with any encoding")
        return None

    def _is_file_updated(self, file_path: str, file_hash: str) -> bool:
        """Check if file has been updated since last ingestion."""
        try:
            result = self.con.execute(
                "SELECT COUNT(*) FROM docs WHERE path = ? AND file_hash = ?", (file_path, file_hash)
            ).fetchone()
            return result[0] == 0  # True if no existing record with same hash
        except Exception:
            return True  # Assume updated if check fails

    def ingest_file(
        self, file_path: str, chunk_size: int = 800, force: bool = False
    ) -> tuple[int, int]:
        """
        Ingest a single file into the RAG database.
        Returns (chunks_added, chunks_skipped).
        """
        if not os.path.exists(file_path):
            print(f"Error: File not found: {file_path}")
            return 0, 0

        # Check if file needs updating
        file_hash = self._get_file_hash(file_path)
        if not force and not self._is_file_updated(file_path, file_hash):
            print(f"Skipping {file_path} (unchanged)")
            return 0, 1

        # Remove existing entries for this file
        self.con.execute("DELETE FROM docs WHERE path = ?", (file_path,))

        # Read file content
        content = self._read_file(file_path)
        if not content:
            return 0, 0

        # Generate chunks
        chunks = self._chunk_text(content, chunk_size)

        added = 0
        skipped = 0

        print(f"Processing {file_path}: {len(chunks)} chunks")

        for i, chunk in enumerate(chunks):
            if not chunk.strip():
                skipped += 1
                continue

            # Generate embedding
            embedding = self._embed_text(chunk)
            if embedding is None:
                print(f"  Skipping chunk {i + 1}: embedding failed")
                skipped += 1
                continue

            # Insert into database
            try:
                self.con.execute(
                    """
                    INSERT INTO docs (path, chunk, emb, chunk_index, file_hash, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                    (file_path, chunk, embedding, i, file_hash),
                )
                added += 1

                if (i + 1) % 10 == 0:
                    print(f"  Processed {i + 1}/{len(chunks)} chunks")

            except Exception as e:
                print(f"  Error inserting chunk {i + 1}: {e}")
                skipped += 1

        return added, skipped

    def ingest_paths(
        self,
        paths: list[str],
        chunk_size: int = 800,
        force: bool = False,
        file_patterns: list[str] = None,
    ) -> dict[str, tuple[int, int]]:
        """
        Ingest multiple files or directories.
        Returns dict mapping file paths to (added, skipped) counts.
        """
        if file_patterns is None:
            file_patterns = ["**/*.md", "**/*.txt", "**/*.rst"]

        all_files = set()

        for path in paths:
            path_obj = pathlib.Path(path)

            if path_obj.is_file():
                all_files.add(str(path_obj))
            elif path_obj.is_dir():
                for pattern in file_patterns:
                    all_files.update(str(p) for p in path_obj.glob(pattern))
            else:
                print(f"Warning: Path not found: {path}")

        if not all_files:
            print("No files found to ingest")
            return {}

        print(f"Found {len(all_files)} files to process")

        results = {}
        total_added = 0
        total_skipped = 0

        for file_path in sorted(all_files):
            try:
                added, skipped = self.ingest_file(file_path, chunk_size, force)
                results[file_path] = (added, skipped)
                total_added += added
                total_skipped += skipped
            except Exception as e:
                print(f"Error processing {file_path}: {e}")
                results[file_path] = (0, 1)
                total_skipped += 1

        print(f"\nIngestion complete: {total_added} chunks added, {total_skipped} skipped")
        return results

    def get_stats(self) -> dict[str, any]:
        """Get database statistics."""
        try:
            stats = {}

            # Total chunks
            result = self.con.execute("SELECT COUNT(*) FROM docs").fetchone()
            stats["total_chunks"] = result[0]

            # Unique files
            result = self.con.execute("SELECT COUNT(DISTINCT path) FROM docs").fetchone()
            stats["unique_files"] = result[0]

            # Database size
            stats["db_size_mb"] = os.path.getsize(self.db_path) / (1024 * 1024)

            # Recent additions
            result = self.con.execute(
                """
                SELECT COUNT(*) FROM docs 
                WHERE created_at > datetime('now', '-24 hours')
            """
            ).fetchone()
            stats["recent_additions"] = result[0]

            return stats
        except Exception as e:
            print(f"Error getting stats: {e}")
            return {}

    def close(self):
        """Close database connection."""
        if hasattr(self, "con"):
            self.con.close()


def main():
    parser = argparse.ArgumentParser(description="Enhanced RAG document ingestion")
    parser.add_argument("paths", nargs="+", help="Files or directories to ingest")
    parser.add_argument("--db", default="rag/index/rag.duckdb", help="DuckDB database path")
    parser.add_argument("--chunk-size", type=int, default=800, help="Chunk size in characters")
    parser.add_argument(
        "--force", action="store_true", help="Force re-ingestion of unchanged files"
    )
    parser.add_argument(
        "--patterns",
        nargs="+",
        default=["**/*.md", "**/*.txt", "**/*.rst"],
        help="File patterns to match",
    )
    parser.add_argument(
        "--stats", action="store_true", help="Show database statistics after ingestion"
    )
    parser.add_argument(
        "--embed-model", default="nomic-embed-text", help="Ollama embedding model name"
    )
    parser.add_argument("--ollama-host", default="127.0.0.1", help="Ollama host")
    parser.add_argument("--ollama-port", type=int, default=11434, help="Ollama port")

    args = parser.parse_args()

    # Create ingestor
    ingestor = RAGIngestor(
        db_path=args.db,
        ollama_host=args.ollama_host,
        ollama_port=args.ollama_port,
        embed_model=args.embed_model,
    )

    try:
        # Ingest files
        results = ingestor.ingest_paths(
            args.paths, chunk_size=args.chunk_size, force=args.force, file_patterns=args.patterns
        )

        # Show statistics if requested
        if args.stats or not results:
            print("\n=== Database Statistics ===")
            stats = ingestor.get_stats()
            for key, value in stats.items():
                if key == "db_size_mb":
                    print(f"{key.replace('_', ' ').title()}: {value:.2f} MB")
                else:
                    print(f"{key.replace('_', ' ').title()}: {value}")

        # Print per-file results
        if results:
            print("\n=== Ingestion Results ===")
            for file_path, (added, skipped) in results.items():
                if added > 0:
                    print(f"✅ {file_path}: {added} chunks added")
                elif skipped > 0:
                    print(f"⏭️  {file_path}: skipped (unchanged)")
                else:
                    print(f"❌ {file_path}: failed to process")

    except KeyboardInterrupt:
        print("\nIngestion interrupted by user")
        return 1
    except Exception as e:
        print(f"Error during ingestion: {e}")
        return 1
    finally:
        ingestor.close()

    return 0


if __name__ == "__main__":
    exit(main())
