from backend.mcp_server.tools import list_tools, get_tool, simulate_tool


def get_mcp_registry():
    tools = list_tools()

    return {
        "name": "Splunk MCP-ready Business Control Surface",
        "description": (
            "10 agent-callable business tools that convert Splunk telemetry "
            "into payment release decisions, supplier checks, insider-risk correlation, "
            "control validation, business action recommendation, and human-approved audit logging."
        ),
        "current_adapter": "Live Splunk REST/Python adapter",
        "target_adapter": "Official Splunk MCP Server mapping",
        "tool_count": len(tools),
        "tools": tools,
    }


def get_mcp_tool(tool_name: str):
    tool = get_tool(tool_name)

    if not tool:
        return {
            "status": "not_found",
            "message": f"Tool '{tool_name}' does not exist.",
        }

    return {
        "status": "found",
        "tool": tool,
    }


def simulate_mcp_tool(tool_name: str, payload: dict | None = None):
    return simulate_tool(tool_name, payload)