from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import habits, mood, analytics, health_aspects, export

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Habits Tracker API",
    description="API for tracking habits and mood with correlation analysis",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(habits.router, prefix="/api/habits", tags=["habits"])
app.include_router(mood.router, prefix="/api/mood", tags=["mood"])
app.include_router(health_aspects.router, prefix="/api/health-aspects", tags=["health-aspects"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(export.router, prefix="/api/export", tags=["export"])

@app.get("/")
async def root():
    return {"message": "Habits Tracker API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

