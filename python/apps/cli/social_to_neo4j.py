import argparse
import os
import sys
from pathlib import Path

# Ensure local package import
ROOT = Path(__file__).resolve().parents[2]
PY_SRC = ROOT
if str(PY_SRC) not in sys.path:
    sys.path.insert(0, str(PY_SRC))

from intelgraph_py.connectors.social.listener import fetch_rss, fetch_twitter
from intelgraph_py.models import Entity


def upsert_posts(store, posts):
    count = 0
    for p in posts:
        eid = f"{p.source}:{p.id}" if not str(p.id).startswith(f"{p.source}:") else str(p.id)
        props = {
            "source": p.source,
            "author": p.author,
            "text": p.text,
            "url": p.url,
            "timestamp": p.timestamp,
        }
        store.upsert_entity(Entity(id=eid, type="SocialPost", props=props))
        count += 1
    return count


def link_by_author(store, posts):
    from intelgraph_py.models import Relationship

    created = 0
    for p in posts:
        author = (p.author or "").strip()
        if not author:
            continue
        post_id = f"{p.source}:{p.id}" if not str(p.id).startswith(f"{p.source}:") else str(p.id)
        author_id = f"author:{author}"
        store.upsert_entity(Entity(id=author_id, type="Author", props={"name": author}))
        store.upsert_relationship(
            Relationship(src=post_id, dst=author_id, kind="POSTED_BY", confidence=1.0)
        )
        created += 1
    return created


def link_same_author(store, posts):
    import datetime as dt

    from intelgraph_py.models import Relationship

    by_author = {}
    for p in posts:
        author = (p.author or "").strip()
        if not author:
            continue
        by_author.setdefault(author, []).append(p)

    def parse_ts(ts: str):
        try:
            return dt.datetime.fromisoformat((ts or "").replace("Z", "+00:00"))
        except Exception:
            return None

    created = 0
    for author, group in by_author.items():
        group.sort(key=lambda p: (parse_ts(p.timestamp) or p.timestamp or ""))
        for i in range(len(group) - 1):
            a = group[i]
            b = group[i + 1]
            a_id = f"{a.source}:{a.id}" if not str(a.id).startswith(f"{a.source}:") else str(a.id)
            b_id = f"{b.source}:{b.id}" if not str(b.id).startswith(f"{b.source}:") else str(b.id)
            store.upsert_relationship(
                Relationship(src=a_id, dst=b_id, kind="SAME_AUTHOR", confidence=0.9)
            )
            created += 1
    return created


def main():
    ap = argparse.ArgumentParser(
        description="Export RSS/Twitter posts into Neo4j as SocialPost entities"
    )
    ap.add_argument(
        "--rss", action="append", help="RSS/Atom feed URL or local file; can be repeated"
    )
    ap.add_argument(
        "--twitter-query",
        help="Twitter search query (uses TWITTER_MOCK_FILE or bearer token if set)",
    )
    ap.add_argument("--limit", type=int, default=100, help="Max posts to process from each source")
    ap.add_argument(
        "--dry-run", action="store_true", help="Do not write to Neo4j; just print counts"
    )
    ap.add_argument("--neo4j-uri", default=os.getenv("NEO4J_URI", "bolt://localhost:7687"))
    ap.add_argument("--neo4j-user", default=os.getenv("NEO4J_USER", "neo4j"))
    ap.add_argument("--neo4j-password", default=os.getenv("NEO4J_PASSWORD", "testpassword"))
    ap.add_argument("--neo4j-database", default=os.getenv("NEO4J_DATABASE", None))
    ap.add_argument(
        "--link-by-author",
        action="store_true",
        help="Create Author nodes and POSTED_BY relationships",
    )
    ap.add_argument(
        "--link-same-author",
        action="store_true",
        help="Create SAME_AUTHOR relationships as a chain per author",
    )
    args = ap.parse_args()

    total = 0
    if args.dry_run:
        if args.rss:
            for src in args.rss:
                posts = list(fetch_rss(src))[: args.limit]
                rels = 0
                if args.link_by_author:
                    rels += sum(1 for p in posts if (p.author or "").strip())
                if args.link_same_author:
                    # chain count per author group: max(n-1, 0)
                    by_author = {}
                    for p in posts:
                        a = (p.author or "").strip()
                        if not a:
                            continue
                        by_author.setdefault(a, 0)
                        by_author[a] += 1
                    rels += sum(max(n - 1, 0) for n in by_author.values())
                print(f"RSS: would upsert {len(posts)} posts from {src} (relationships: {rels})")
                total += len(posts)
        if args.twitter_query:
            posts = list(fetch_twitter(args.twitter_query))[: args.limit]
            rels = 0
            if args.link_by_author:
                rels += sum(1 for p in posts if (p.author or "").strip())
            if args.link_same_author:
                by_author = {}
                for p in posts:
                    a = (p.author or "").strip()
                    if not a:
                        continue
                    by_author.setdefault(a, 0)
                    by_author[a] += 1
                rels += sum(max(n - 1, 0) for n in by_author.values())
            print(
                f"Twitter: would upsert {len(posts)} posts for query '{args.twitter_query}' (relationships: {rels})"
            )
            total += len(posts)
        print(f"Dry-run complete. {total} posts parsed.")
        return

    # Defer import so --dry-run works without neo4j driver installed
    from intelgraph_py.storage.neo4j_store import Neo4jStore

    store = Neo4jStore(
        args.neo4j_uri, args.neo4j_user, args.neo4j_password, database=args.neo4j_database
    )
    try:
        if args.rss:
            for src in args.rss:
                posts = list(fetch_rss(src))[: args.limit]
                total += upsert_posts(store, posts)
                rels = 0
                if args.link_by_author:
                    rels += link_by_author(store, posts)
                if args.link_same_author:
                    rels += link_same_author(store, posts)
                print(f"RSS: upserted {len(posts)} posts from {src} (relationships: {rels})")
        if args.twitter_query:
            posts = list(fetch_twitter(args.twitter_query))[: args.limit]
            total += upsert_posts(store, posts)
            rels = 0
            if args.link_by_author:
                rels += link_by_author(store, posts)
            if args.link_same_author:
                rels += link_same_author(store, posts)
            print(
                f"Twitter: upserted {len(posts)} posts for query '{args.twitter_query}' (relationships: {rels})"
            )
        print(f"Done. Upserted {total} posts.")
    finally:
        store.close()


if __name__ == "__main__":
    main()
