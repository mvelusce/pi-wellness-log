from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.database import engine, Base
from app.routers import lifestyle_factors, wellbeing, analytics, export, auth, cbt

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Wellness Log API",
    description="API for tracking lifestyle factors and well-being metrics with correlation analysis",
    version="1.0.0",
    # Trust proxy headers for correct URL generation in redirects
    root_path="",
    proxy_headers=True,
    forwarded_allow_ips="*"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth router (public, no authentication required)
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])

# Protected routers (authentication required - will be added via dependency)
app.include_router(lifestyle_factors.router, prefix="/api/lifestyle-factors", tags=["lifestyle-factors"])
app.include_router(wellbeing.router, prefix="/api/wellbeing", tags=["wellbeing"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(export.router, prefix="/api/export", tags=["export"])
app.include_router(cbt.router, prefix="/api/cbt", tags=["cbt"])

@app.get("/")
async def root():
    return {"message": "Wellness Log API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

