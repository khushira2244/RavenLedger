from pathlib import Path
import sys
import json

from fastapi import APIRouter
from pydantic import BaseModel

ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT_DIR))

from backend.agents.human_action_agent import HumanActionAgent

ACTION_LOG_PATH = ROOT_DIR / "data" / "processed" / "action_log.json"


router = APIRouter(prefix="/actions", tags=["Actions"])


class ActionRequest(BaseModel):
    case_id: str
    action: str
    actor: str = "Demo Analyst"
    reason: str = ""


@router.post("/simulate")
def simulate_action(request: ActionRequest):
    agent = HumanActionAgent()

    result = agent.run(
        case_id=request.case_id,
        action=request.action,
        actor=request.actor,
        reason=request.reason,
    )

    return result


@router.get("/log")
def get_action_log():
    if not ACTION_LOG_PATH.exists():
        return {
            "count": 0,
            "actions": [],
        }

    with open(ACTION_LOG_PATH, "r", encoding="utf-8") as file:
        actions = json.load(file)

    return {
        "count": len(actions),
        "actions": actions,
    }