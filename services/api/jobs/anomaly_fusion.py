import os

import numpy as np
from neo4j import GraphDatabase

driver = GraphDatabase.driver(
    os.getenv("NEO4J_URI", "bolt://neo4j:7687"),
    auth=(os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASS", "neo4jpass")),
)


def _calibrate_model(coordination_score, rhythm_index, follower_anomaly, motif_burst_z):
    # Placeholder for a small calibrated model (logistic regression, GBM, etc.)
    # For MVP, a simple weighted sum
    weights = {"coordination": 0.4, "rhythmicity": 0.2, "follower_anomaly": 0.2, "motif_burst": 0.2}

    # Normalize inputs to a 0-1 scale if they aren't already
    # These normalization factors are arbitrary for the MVP
    norm_coordination = min(1.0, coordination_score / 10.0)
    norm_rhythm = min(1.0, rhythm_index / 3.0)  # Assuming rhythm_index can go up to ~3
    norm_follower = min(1.0, follower_anomaly / 5.0)  # Assuming follower_anomaly can go up to ~5
    norm_motif = min(1.0, motif_burst_z / 5.0)  # Assuming z-score can go up to ~5

    anomaly_score = (
        weights["coordination"] * norm_coordination
        + weights["rhythmicity"] * norm_rhythm
        + weights["follower_anomaly"] * norm_follower
        + weights["motif_burst"] * norm_motif
    )
    return round(anomaly_score, 4)


def run(days: int = 7):
    with driver.session() as s:
        # Fetch relevant signals for Accounts involved in Cases
        case_accounts_signals = s.run(
            """
        MATCH (c:Case)-[:INCLUDES]->(a:Account)
        OPTIONAL MATCH (a)-[coord:COORDINATION]-(:Account)
        OPTIONAL MATCH (a)-[:POSTED]->(m:Message)-[:MENTIONS_NARRATIVE]->(n:Narrative)
        OPTIONAL MATCH (n)<-[mb:MOTIF_BURST]-(:Motif)
        WHERE c.created >= datetime().epochMillis - $ms
        RETURN c.id AS case_id, a.id AS account_id,
               coalesce(avg(coord.score), 0.0) AS avg_coordination_score,
               coalesce(a.rhythm_index, 0.0) AS rhythm_index,
               coalesce(a.follower_anomaly, 0.0) AS follower_anomaly,
               coalesce(avg(mb.z), 0.0) AS avg_motif_burst_z
        """,
            {"ms": days * 24 * 3600 * 1000},
        ).data()

        case_anomaly_scores = defaultdict(list)
        for record in case_accounts_signals:
            anomaly_score = _calibrate_model(
                record["avg_coordination_score"],
                record["rhythm_index"],
                record["follower_anomaly"],
                record["avg_motif_burst_z"],
            )
            case_anomaly_scores[record["case_id"]].append(anomaly_score)

        for case_id, scores in case_anomaly_scores.items():
            final_anomaly_score = np.mean(scores) if scores else 0.0
            s.run(
                """
            MATCH (c:Case {id:$case_id})
            SET c.anomaly_score = $anomaly_score,
                c.anomaly_score_updated = datetime()
            """,
                {"case_id": case_id, "anomaly_score": round(final_anomaly_score, 4)},
            )


if __name__ == "__main__":
    run()
