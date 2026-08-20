"""
MAIN — The entry point. Wires routes, WebSocket, CORS, and startup.

This file should be boring. If there's interesting logic here,
it belongs somewhere else.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from .config import settings
from .api.routes import router
from .api.websocket import websocket_refine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)

app = FastAPI(
    title="Judge Loop",
    description="LLM self-improvement through iterative evaluation and structured feedback",
    version="0.1.0",
)

# CORS — let the React dev server talk to us
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST routes
app.include_router(router)

# WebSocket endpoint
app.add_websocket_route("/ws/refine", websocket_refine)


@app.get("/health")
async def health():
    """Simple health check — also shows which providers are configured."""
    return {
        "status": "ok",
        "providers": settings.get_available_providers(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )
