from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings
from app.core.logging import logger

Base = declarative_base()

def get_engine():
    db_url = settings.DATABASE_URL
    if not db_url:
        return None
    # Ensure postgresql:// scheme is compatible with psycopg2
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    
    return create_engine(
        db_url,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=10,
    )

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) if engine else None

def get_db():
    if not SessionLocal:
        yield None
        return
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    if engine:
        try:
            logger.info("Connecting to Neon PostgreSQL Database and ensuring tables exist...")
            Base.metadata.create_all(bind=engine)
            logger.info("Neon Database tables verified successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize Neon Database: {e}")
