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
        "postgresql://sih_admin:sih_secure_password@localhost:5432/sih_investigation"
    )
    SQLALCHEMY_DATABASE_URI: str = os.getenv(
        "POSTGRES_URI", 
        "postgresql://sih_admin:sih_secure_password@localhost:5432/sih_investigation"
    )

    # JWT & Authentication settings
    JWT_SECRET: str = os.getenv("JWT_SECRET", "sih_2026_super_secret_key_change_in_production")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

    # Brute-force & Account lockout policy
    MAX_LOGIN_ATTEMPTS: int = int(os.getenv("MAX_LOGIN_ATTEMPTS", "5"))
    LOCKOUT_DURATION_MINUTES: int = int(os.getenv("LOCKOUT_DURATION_MINUTES", "15"))

    # Cookie & CORS settings
    COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "False").lower() in ("true", "1")
    COOKIE_SAMESITE: str = os.getenv("COOKIE_SAMESITE", "lax")
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173")

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        case_sensitive = True

settings = Settings()
