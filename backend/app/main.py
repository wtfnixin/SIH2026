from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.v1.ingest_routes import router as ingest_router
from app.api.v1.graph_routes import router as graph_router
from app.api.v1.entity_routes import router as entity_router
from app.api.v1.analytics_routes import router as analytics_router
from app.api.v1.copilot_routes import router as copilot_router
from app.api.v1.geo_routes import router as geo_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 Routers
app.include_router(ingest_router, prefix=settings.API_V1_STR)
app.include_router(graph_router, prefix=settings.API_V1_STR)
app.include_router(entity_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(copilot_router, prefix=settings.API_V1_STR)
app.include_router(geo_router, prefix=f"{settings.API_V1_STR}/geo")


@app.get("/")
def read_root():
    return {
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "ONLINE",
        "message": "Criminal Network Analysis System API is operational."
    }


@app.get("/api/health")
def health_check():
    neo4j_status = "unconfigured"
    postgres_status = "unconfigured"

    # Test Neo4j
    try:
        from app.db.neo4j_driver import get_neo4j_session
        with get_neo4j_session() as session:
            session.run("RETURN 1")
        neo4j_status = "healthy"
    except Exception as e:
        neo4j_status = f"error: {str(e)}"

    # Test PostgreSQL
    try:
        from app.db.postgres_driver import engine, Base
        from sqlalchemy import text
        Base.metadata.create_all(bind=engine)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        postgres_status = "healthy"
    except Exception as e:
        postgres_status = f"error: {str(e)}"

    return {
        "status": "healthy" if neo4j_status == "healthy" and postgres_status == "healthy" else "degraded",
        "database_connections": {
            "neo4j": neo4j_status,
            "postgresql": postgres_status
        }
    }
