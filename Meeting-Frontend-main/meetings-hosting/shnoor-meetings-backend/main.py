import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from dotenv import load_dotenv

from core.database import init_db
from routers import meeting, signaling, calendar

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize Database
init_db()

app = FastAPI(
    title="Shnoor Meetings Backend",
    description="Backend Signaling & Chat server for Shnoor Meetings (WebRTC)",
    version="1.0.0"
)

frontend_origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

# CORS configuration for the local frontend during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(meeting.router)
app.include_router(signaling.router)
app.include_router(calendar.router)

@app.get("/")
async def root():
    return {"message": "Welcome to the Shnoor Meetings API"}

if __name__ == "__main__":
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    port = int(os.getenv("BACKEND_PORT", "8000"))
    reload_enabled = os.getenv("BACKEND_RELOAD", "false").lower() == "true"
    uvicorn.run("main:app", host=host, port=port, reload=reload_enabled)
