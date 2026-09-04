"""
Neo4j Database Driver Module
Provides session context manager for executing Cypher queries against Neo4j database.
"""
from neo4j import GraphDatabase
from contextlib import contextmanager
from app.config import settings

driver = GraphDatabase.driver(
    settings.NEO4J_URI,
    auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
)

@contextmanager
def get_neo4j_session():
    """
    Context manager yielding a Neo4j session. Automatically closes session upon exit.
    """
    session = driver.session()
    try:
        yield session
    finally:
        session.close()


def close_neo4j_driver():
    """
    Closes the global driver connection.
    """
    driver.close()
