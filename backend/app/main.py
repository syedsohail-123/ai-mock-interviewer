import sys
import os
from pathlib import Path
from contextlib import asynccontextmanager

# Ensure the backend directory is in the Python module search path
backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import logger
from app.api import cv, interview, report, resume, auth
from app.db.database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Database tables in Neon DB
    init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Setup CORS for Flutter Desktop & Web
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5000",
        "http://127.0.0.1:5000",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(cv.router, prefix=settings.API_V1_PREFIX)
app.include_router(interview.router, prefix=settings.API_V1_PREFIX)
app.include_router(report.router, prefix=settings.API_V1_PREFIX)
app.include_router(resume.router, prefix=settings.API_V1_PREFIX)
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)

@app.get("/")
async def root():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    logger.info(f"Starting server on {settings.HOST}:{settings.PORT}")
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
