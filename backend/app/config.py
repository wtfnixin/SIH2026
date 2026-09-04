import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI-Powered Criminal Network Analysis System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Neo4j settings
    NEO4J_URI: str = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USER: str = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD: str = os.getenv("NEO4J_PASSWORD", "sih2026password")
    
    # PostgreSQL settings
    POSTGRES_URI: str = os.getenv(
        "POSTGRES_URI", 
        "postgresql://sih_admin:sih_secure_password@sih_postgres:5432/sih_investigation"
    )
    SQLALCHEMY_DATABASE_URI: str = os.getenv(
        "POSTGRES_URI", 
        "postgresql://sih_admin:sih_secure_password@sih_postgres:5432/sih_investigation"
    )

    class Config:
        case_sensitive = True

settings = Settings()
