from pathlib import Path
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT_DIR))

from routes.agent import router as agent_router
from routes.cases import router as cases_router
from routes.reports import router as reports_router
from routes.actions import router as actions_router


app = FastAPI(
    title="RavenLedger API",
    description="Multi-Agent ERP RiskOps Investigator on Splunk",
    version="1.0.0",
)

app.router.redirect_slashes = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "name": "RavenLedger",
        "description": "Multi-Agent ERP RiskOps Investigator on Splunk",
        "status": "running",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "ravenledger-api",
        "splunk_mode": "REST/Python live adapter",
        "mcp_status": "MCP-ready adapter architecture",
    }


app.include_router(agent_router)
app.include_router(cases_router)
app.include_router(reports_router)
app.include_router(actions_router)