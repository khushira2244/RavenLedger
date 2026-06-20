from pathlib import Path
import sys

from fastapi import APIRouter

ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT_DIR))

from backend.mcp_server.server import (
    get_mcp_registry,
    get_mcp_tool,
    simulate_mcp_tool,
)
from backend.mcp_server.schemas import McpToolSimulationRequest


router = APIRouter(prefix="/mcp", tags=["Splunk MCP-ready Business Control Surface"])


@router.get("/tools")
def list_mcp_tools():
    return get_mcp_registry()


@router.get("/tools/{tool_name}")
def get_mcp_tool_detail(tool_name: str):
    return get_mcp_tool(tool_name)


@router.post("/tools/{tool_name}/simulate")
def simulate_mcp_tool_call(tool_name: str, request: McpToolSimulationRequest):
    return simulate_mcp_tool(tool_name, request.model_dump())