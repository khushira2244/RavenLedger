from typing import Any, Dict, Optional
from pydantic import BaseModel


class McpToolSimulationRequest(BaseModel):
    case_id: Optional[str] = "RL-CORR-0001"
    supplier_id: Optional[str] = None
    user: Optional[str] = None
    actor: Optional[str] = "Demo Analyst"
    decision: Optional[str] = None
    reason: Optional[str] = None
    extra: Optional[Dict[str, Any]] = None