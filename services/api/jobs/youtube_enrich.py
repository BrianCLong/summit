from neo4j import GraphDatabase
import os, json

driver = GraphDatabase.driver("bolt://neo4j:7687", auth=("neo4j","neo4jpass"))

def run():
    with driver.session() as s:
        # Find YouTube messages without channel info
        videos_to_enrich = s.run("""
        MATCH (m:Message {source:'YOUTUBE'})
        WHERE NOT EXISTS((m)-[:PUBLISHED_BY]->(:Channel))
        RETURN m.id AS video_id, m.url AS video_url
        LIMIT 1000
        """).data()

        for video in videos_to_enrich:
            video_id = video["video_id"]
            video_url = video["video_url"]
            # Placeholder for actual YouTube API call to get channel info
            # For now, we'll simulate it
            channel_id = f"yt_channel_{hash(video_url) % 100}"
            channel_name = f"YouTube Channel {hash(video_url) % 100}"

            s.run("""
            MATCH (m:Message {id:$video_id})
            MERGE (ch:Channel {id:$channel_id, platform:'YOUTUBE', name:$channel_name})
            MERGE (m)-[:PUBLISHED_BY]->(ch)
            """, video_id=video_id, channel_id=channel_id, channel_name=channel_name)

        # Find cross-posting between channels (simplified)
        s.run("""
        MATCH (ch1:Channel)-[:PUBLISHED]->(m1:Message)<-[:POSTED]-(a:Account)-[:POSTED]->(m2:Message)<-[:PUBLISHED]-(ch2:Channel)
        WHERE ch1 <> ch2 AND m1.url = m2.url // Simplified cross-post detection
        MERGE (ch1)-[x:CROSS_POSTED_WITH]-(ch2)
        ON CREATE SET x.count = 1
        ON MATCH SET x.count = x.count + 1
        """)