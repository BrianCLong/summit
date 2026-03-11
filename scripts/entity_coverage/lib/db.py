import os
import psycopg2
from neo4j import GraphDatabase

def get_pg_connection():
    try:
        return psycopg2.connect(
            host=os.getenv("POSTGRES_HOST", "localhost"),
            port=os.getenv("POSTGRES_PORT", "5432"),
            user=os.getenv("POSTGRES_USER", "postgres"),
            password=os.getenv("POSTGRES_PASSWORD", "postgres"),
            database=os.getenv("POSTGRES_DB", "intelgraph")
        )
    except Exception as e:
        print(f"Warning: Could not connect to PostgreSQL: {e}")
        return None

def get_neo4j_driver():
    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    user = os.getenv("NEO4J_USER", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "password")
    try:
        driver = GraphDatabase.driver(uri, auth=(user, password))
        driver.verify_connectivity()
        return driver
    except Exception as e:
        print(f"Warning: Could not connect to Neo4j: {e}")
        return None
