#!/usr/bin/env python3
"""
Enhanced RAG Query Tool with advanced search capabilities
Includes semantic search, keyword filtering, and source attribution.
"""

import argparse
import http.client
import json
from dataclasses import dataclass

import duckdb


@dataclass
class SearchResult:
    """Represents a search result with metadata."""

    chunk: str
    file_path: str
    similarity_score: float
    chunk_index: int
    file_hash: str


class RAGQueryEngine:
    """Enhanced RAG query engine with multiple search modes."""

    def __init__(
        self,
        db_path: str = "rag/index/rag.duckdb",
        ollama_host: str = "127.0.0.1",
        ollama_port: int = 11434,
        litellm_host: str = "127.0.0.1",
        litellm_port: int = 4000,
        embed_model: str = "nomic-embed-text",
        chat_model: str = "local/llama",
    ):
        self.db_path = db_path
        self.ollama_host = ollama_host
        self.ollama_port = ollama_port
        self.litellm_host = litellm_host
        self.litellm_port = litellm_port
        self.embed_model = embed_model
        self.chat_model = chat_model

        # Connect to database
        try:
            self.con = duckdb.connect(db_path)
            # Verify database structure
            tables = self.con.execute("SHOW TABLES").fetchall()
            if not any("docs" in str(table) for table in tables):
                raise Exception("No 'docs' table found in database")
        except Exception as e:
            raise Exception(f"Failed to connect to database {db_path}: {e}")

    def _embed_query(self, query: str, retries: int = 3) -> list[float] | None:
        """Generate embedding for query text."""
        for attempt in range(retries):
            try:
                conn = http.client.HTTPConnection(self.ollama_host, self.ollama_port, timeout=60)

                payload = {"model": self.embed_model, "prompt": query}
                body = json.dumps(payload).encode("utf-8")
                headers = {"Content-Type": "application/json"}

                conn.request("POST", "/api/embeddings", body, headers)
                response = conn.getresponse()

                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    embedding = data.get("embedding", [])
                    if isinstance(embedding, list) and len(embedding) == 768:
                        return embedding

                print(f"Embedding API returned status {response.status}")

            except Exception as e:
                print(f"Embedding attempt {attempt + 1} failed: {e}")
                if attempt < retries - 1:
                    import time

                    time.sleep(0.5 * (attempt + 1))
            finally:
                try:
                    conn.close()
                except:
                    pass

        return None

    def _cosine_similarity(self, vec1: list[float], vec2: list[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        dot_product = sum(a * b for a, b in zip(vec1, vec2, strict=False))
        magnitude1 = sum(a * a for a in vec1) ** 0.5
        magnitude2 = sum(b * b for b in vec2) ** 0.5

        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0

        return dot_product / (magnitude1 * magnitude2)

    def search_semantic(
        self,
        query: str,
        limit: int = 10,
        file_filter: str | None = None,
        min_similarity: float = 0.0,
    ) -> list[SearchResult]:
        """Perform semantic search using embeddings."""
        # Get query embedding
        query_embedding = self._embed_query(query)
        if not query_embedding:
            print("Error: Failed to generate query embedding")
            return []

        # Build SQL query with optional file filtering
        sql = """
            SELECT path, chunk, emb, chunk_index, file_hash 
            FROM docs
        """
        params = []

        if file_filter:
            sql += " WHERE path LIKE ?"
            params.append(f"%{file_filter}%")

        try:
            rows = self.con.execute(sql, params).fetchall()
        except Exception as e:
            print(f"Database query failed: {e}")
            return []

        if not rows:
            print("No documents found in database")
            return []

        # Calculate similarities
        results = []
        for path, chunk, embedding, chunk_index, file_hash in rows:
            if not embedding or len(embedding) != 768:
                continue

            similarity = self._cosine_similarity(query_embedding, embedding)

            if similarity >= min_similarity:
                results.append(
                    SearchResult(
                        chunk=chunk,
                        file_path=path,
                        similarity_score=similarity,
                        chunk_index=chunk_index or 0,
                        file_hash=file_hash or "",
                    )
                )

        # Sort by similarity and return top results
        results.sort(key=lambda x: x.similarity_score, reverse=True)
        return results[:limit]

    def search_keyword(
        self,
        query: str,
        limit: int = 10,
        file_filter: str | None = None,
        case_sensitive: bool = False,
    ) -> list[SearchResult]:
        """Perform keyword-based search."""
        # Build SQL query
        sql = """
            SELECT path, chunk, emb, chunk_index, file_hash 
            FROM docs 
            WHERE chunk LIKE ?
        """
        params = []

        # Handle case sensitivity
        search_pattern = f"%{query}%" if case_sensitive else f"%{query.lower()}%"
        params.append(search_pattern)

        if not case_sensitive:
            sql = sql.replace("chunk LIKE ?", "LOWER(chunk) LIKE ?")

        if file_filter:
            sql += " AND path LIKE ?"
            params.append(f"%{file_filter}%")

        sql += f" LIMIT {limit}"

        try:
            rows = self.con.execute(sql, params).fetchall()
        except Exception as e:
            print(f"Database query failed: {e}")
            return []

        results = []
        for path, chunk, embedding, chunk_index, file_hash in rows:
            # Calculate pseudo-similarity based on keyword frequency
            query_lower = query.lower()
            chunk_lower = chunk.lower()
            word_count = chunk_lower.count(query_lower)
            similarity = min(1.0, word_count / 10.0)  # Normalize to 0-1

            results.append(
                SearchResult(
                    chunk=chunk,
                    file_path=path,
                    similarity_score=similarity,
                    chunk_index=chunk_index or 0,
                    file_hash=file_hash or "",
                )
            )

        return results

    def generate_answer(
        self, query: str, search_results: list[SearchResult], system_prompt: str = None
    ) -> str:
        """Generate answer using LLM with retrieved context."""
        if not search_results:
            return "No relevant information found in the knowledge base."

        # Build context from search results
        context_parts = []
        for i, result in enumerate(search_results[:5], 1):  # Limit to top 5 for context
            # Truncate very long chunks
            chunk = result.chunk[:600] + "..." if len(result.chunk) > 600 else result.chunk
            context_parts.append(f"[{i}] {chunk}")

        context = "\n---\n".join(context_parts)

        # Build messages
        default_system = (
            "Answer the question using the provided context. "
            "Cite sources using [1], [2], etc. Be concise and accurate. "
            "If the context doesn't contain enough information to answer, say so."
        )

        messages = [
            {"role": "system", "content": system_prompt or default_system},
            {"role": "user", "content": f"Question: {query}\n\nContext:\n{context}"},
        ]

        # Query LiteLLM
        try:
            conn = http.client.HTTPConnection(self.litellm_host, self.litellm_port, timeout=120)

            payload = {
                "model": self.chat_model,
                "messages": messages,
                "temperature": 0.1,
                "max_tokens": 1000,
            }

            body = json.dumps(payload).encode("utf-8")
            headers = {"Content-Type": "application/json", "Authorization": "Bearer sk-anything"}

            conn.request("POST", "/v1/chat/completions", body, headers)
            response = conn.getresponse()

            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                return data["choices"][0]["message"]["content"]
            else:
                return f"Error: LLM API returned status {response.status}"

        except Exception as e:
            return f"Error generating answer: {e}"
        finally:
            try:
                conn.close()
            except:
                pass

    def get_file_list(self) -> list[tuple[str, int]]:
        """Get list of indexed files with chunk counts."""
        try:
            rows = self.con.execute(
                """
                SELECT path, COUNT(*) as chunk_count
                FROM docs 
                GROUP BY path 
                ORDER BY path
            """
            ).fetchall()
            return [(path, count) for path, count in rows]
        except Exception as e:
            print(f"Error getting file list: {e}")
            return []

    def get_stats(self) -> dict[str, any]:
        """Get database statistics."""
        try:
            stats = {}

            # Basic counts
            result = self.con.execute("SELECT COUNT(*) FROM docs").fetchone()
            stats["total_chunks"] = result[0]

            result = self.con.execute("SELECT COUNT(DISTINCT path) FROM docs").fetchone()
            stats["unique_files"] = result[0]

            # Average chunk size
            result = self.con.execute("SELECT AVG(LENGTH(chunk)) FROM docs").fetchone()
            stats["avg_chunk_size"] = int(result[0]) if result[0] else 0

            return stats
        except Exception as e:
            print(f"Error getting stats: {e}")
            return {}

    def close(self):
        """Close database connection."""
        if hasattr(self, "con"):
            self.con.close()


def format_results(
    results: list[SearchResult], show_sources: bool = True, show_scores: bool = False
) -> str:
    """Format search results for display."""
    if not results:
        return "No results found."

    output = []
    for i, result in enumerate(results, 1):
        header = f"[{i}]"

        if show_scores:
            header += f" (similarity: {result.similarity_score:.3f})"

        if show_sources:
            header += f" {result.file_path}"
            if result.chunk_index > 0:
                header += f" (chunk {result.chunk_index + 1})"

        output.append(f"{header}\n{result.chunk}\n")

    return "\n---\n".join(output)


def main():
    parser = argparse.ArgumentParser(description="Enhanced RAG query tool")
    parser.add_argument("query", nargs="*", help="Search query")
    parser.add_argument("--db", default="rag/index/rag.duckdb", help="DuckDB database path")
    parser.add_argument(
        "--mode", choices=["semantic", "keyword", "hybrid"], default="semantic", help="Search mode"
    )
    parser.add_argument("--limit", type=int, default=5, help="Maximum number of results")
    parser.add_argument("--file-filter", help="Filter results by file path pattern")
    parser.add_argument(
        "--min-similarity",
        type=float,
        default=0.0,
        help="Minimum similarity threshold for semantic search",
    )
    parser.add_argument(
        "--no-answer", action="store_true", help="Only show search results, don't generate answer"
    )
    parser.add_argument(
        "--show-scores", action="store_true", help="Show similarity scores in results"
    )
    parser.add_argument(
        "--show-sources", action="store_true", default=True, help="Show source file paths"
    )
    parser.add_argument("--list-files", action="store_true", help="List all indexed files and exit")
    parser.add_argument("--stats", action="store_true", help="Show database statistics and exit")
    parser.add_argument(
        "--chat-model", default="local/llama", help="Chat model for answer generation"
    )

    args = parser.parse_args()

    # Handle query from command line arguments
    query = " ".join(args.query).strip()
    if query.startswith("q="):
        query = query[2:]

    # Create query engine
    try:
        engine = RAGQueryEngine(db_path=args.db, chat_model=args.chat_model)
    except Exception as e:
        print(f"Error initializing query engine: {e}")
        return 1

    try:
        # Handle special commands
        if args.list_files:
            files = engine.get_file_list()
            print(f"Indexed files ({len(files)} total):")
            for file_path, chunk_count in files:
                print(f"  {file_path} ({chunk_count} chunks)")
            return 0

        if args.stats:
            stats = engine.get_stats()
            print("Database Statistics:")
            for key, value in stats.items():
                print(f"  {key.replace('_', ' ').title()}: {value}")
            return 0

        if not query:
            print("Error: No query provided")
            parser.print_help()
            return 1

        # Perform search
        print(f"Searching for: {query}")

        if args.mode == "semantic":
            results = engine.search_semantic(
                query,
                limit=args.limit,
                file_filter=args.file_filter,
                min_similarity=args.min_similarity,
            )
        elif args.mode == "keyword":
            results = engine.search_keyword(query, limit=args.limit, file_filter=args.file_filter)
        else:  # hybrid mode
            # Combine semantic and keyword results
            semantic_results = engine.search_semantic(
                query, limit=args.limit // 2, file_filter=args.file_filter
            )
            keyword_results = engine.search_keyword(
                query, limit=args.limit // 2, file_filter=args.file_filter
            )

            # Merge and deduplicate
            seen_chunks = set()
            results = []
            for result in semantic_results + keyword_results:
                chunk_key = (result.file_path, result.chunk_index)
                if chunk_key not in seen_chunks:
                    seen_chunks.add(chunk_key)
                    results.append(result)

            results.sort(key=lambda x: x.similarity_score, reverse=True)
            results = results[: args.limit]

        if not results:
            print("No results found.")
            return 0

        # Show results
        if args.no_answer:
            print("\nSearch Results:")
            print(format_results(results, args.show_sources, args.show_scores))
        else:
            # Generate answer
            answer = engine.generate_answer(query, results)
            print(f"\nAnswer:\n{answer}")

            # Show sources
            print(f"\nSources ({len(results)} found):")
            for i, result in enumerate(results, 1):
                score_info = (
                    f" (similarity: {result.similarity_score:.3f})" if args.show_scores else ""
                )
                print(f"[{i}] {result.file_path}{score_info}")

    except KeyboardInterrupt:
        print("\nQuery interrupted by user")
        return 1
    except Exception as e:
        print(f"Error during query: {e}")
        return 1
    finally:
        engine.close()

    return 0


if __name__ == "__main__":
    exit(main())
